// Supabase Edge Function: webhooks
// Handles incoming Webhook triggers (path-based /webhooks/:token, query token, or body payload)
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

interface SendNotificationPayload {
  channelId?: string;
  channel_id?: string;
  webhookToken?: string;
  webhook_token?: string;
  recipientId?: string;
  recipient_id?: string;
  userId?: string;
  user_id?: string;
  title: string;
  message?: string;
  content?: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'debug';
  priority?: string; // free-form; no DB constraint on allowed values
  category?: string;
  channel?: string; // delivery method: in_app, push, email, webhook, slack
  metadata?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  actionUrl?: string;
  action_url?: string;
  actionLabel?: string;
  action_label?: string;
  sender?: {
    name: string;
    avatar?: string;
    role?: string;
  };
  ttlDays?: number;
}

function isValidUUID(str: unknown): boolean {
  if (typeof str !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

serve(async (req: Request) => {
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // A webhook is intentionally open: it accepts a message from ANY source
    // with no Supabase session. The channel webhook token (in the path / query /
    // header / body) is the only credential; a tokenless call targets a user
    // directly via body.user_id / recipient_id.

    // Extract params from URL (Path parameter or Query string)
    const reqUrl = new URL(req.url);
    const pathParts = reqUrl.pathname.split("/").filter(Boolean);
    // e.g. /functions/v1/webhooks/5a8065efaf6e78a9f2fddd71ae55e163
    const lastPathSegment = pathParts[pathParts.length - 1];
    const pathToken = lastPathSegment && lastPathSegment !== "webhooks" && lastPathSegment !== "send-notification" && lastPathSegment !== "v1" ? lastPathSegment : null;

    const queryToken = reqUrl.searchParams.get("token") || reqUrl.searchParams.get("webhookToken") || reqUrl.searchParams.get("webhook_token");
    const queryChannelId = reqUrl.searchParams.get("channel_id") || reqUrl.searchParams.get("channelId") || reqUrl.searchParams.get("id");
    const headerToken = req.headers.get("x-channel-token") || req.headers.get("x-webhook-token") || req.headers.get("x-token");

    // Parse request body
    const body: SendNotificationPayload = await req.json().catch(() => ({ title: "Webhook Alert", message: "Incoming webhook trigger" }));

    const title = body.title || "Webhook Alert";
    const message = body.message || body.content || "Notification received via webhook";
    const content = body.content || body.message || message;

    if (!title || !message) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: title, and message/content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let targetChannelId = body.channelId || body.channel_id || queryChannelId || null;
    const webhookToken = body.webhookToken || body.webhook_token || queryToken || pathToken || headerToken || null;
    let targetUserId = body.userId || body.user_id || null;

    let foundChannel: Record<string, unknown> | null = null;

    // 1. If webhook token is provided, look up channel
    if (webhookToken && !targetChannelId) {
      const { data: ch } = await supabase
        .from("channels")
        .select("id, user_id, name, is_active, expires_at, description, webhook_token")
        .eq("webhook_token", webhookToken)
        .maybeSingle();

      if (ch) {
        foundChannel = ch;
        targetChannelId = ch.id;
        if (!targetUserId && ch.user_id) {
          targetUserId = ch.user_id;
        }
      } else {
        // Check if webhookToken is a UUID channel_id
        if (isValidUUID(webhookToken)) {
          const { data: chById } = await supabase
            .from("channels")
            .select("id, user_id, name, is_active, expires_at, description, webhook_token")
            .eq("id", webhookToken)
            .maybeSingle();

          if (chById) {
            foundChannel = chById;
            targetChannelId = chById.id;
            if (!targetUserId && chById.user_id) {
              targetUserId = chById.user_id;
            }
          }
        }
      }
    }

    // 2. If targetChannelId is provided, verify channel exists
    if (targetChannelId && !foundChannel) {
      const { data: ch } = await supabase
        .from("channels")
        .select("id, user_id, name, is_active, expires_at, description, webhook_token")
        .eq("id", targetChannelId)
        .maybeSingle();

      if (ch) {
        foundChannel = ch;
        if (!targetUserId && ch.user_id) {
          targetUserId = ch.user_id;
        }
      }
    }

    const targetRecipientId = body.recipientId || body.recipient_id || (targetUserId ? String(targetUserId) : null) || (targetChannelId ? `channel:${targetChannelId}` : 'broadcast');

    const deliveryChannel = body.channel || 'in_app';
    const notifType = body.type || 'info';
    const priority = body.priority || 'normal';
    const category = body.category || 'system';
    const metadata = body.metadata || body.payload || {};
    const ttlDays = body.ttlDays || 3;
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();

    // 3. Insert into public.notifications
    const { data: notification, error: insertError } = await supabase
      .from("notifications")
      .insert({
        channel_id: isValidUUID(targetChannelId) ? targetChannelId : null,
        user_id: isValidUUID(targetUserId) ? targetUserId : null,
        recipient_id: targetRecipientId,
        title: title,
        message: message,
        content: content,
        type: notifType,
        priority: priority,
        category: category,
        channel: deliveryChannel,
        read: false,
        is_read: false,
        metadata: metadata,
        payload: metadata,
        action_url: body.actionUrl || body.action_url || null,
        action_label: body.actionLabel || body.action_label || null,
        sender: body.sender || { name: "Notification Hub", role: "Dispatcher" },
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    const latencyMs = Date.now() - startTime;

    // 4. Telemetry: Log to delivery_logs asynchronously
    try {
      await supabase.from("delivery_logs").insert({
        notification_id: notification.id,
        channel: deliveryChannel,
        status: "delivered",
        latency_ms: latencyMs,
        attempt_count: 1,
        provider: "supabase_edge_function",
        metadata: {
          dispatchedVia: "edge_function_webhooks",
          channelId: targetChannelId,
          recipientId: targetRecipientId,
        },
      });
    } catch (logErr) {
      console.warn("Delivery log recording note:", logErr);
    }

    // 5. Fan out to Web Push (best-effort — a missing/invalid VAPID config
    // or zero subscriptions must not fail the webhook response).
    try {
      const { error: pushError } = await supabase.functions.invoke("send-webpush", {
        body: {
          notification_id: notification.id,
          user_id: isValidUUID(targetUserId) ? targetUserId : null,
          channel_id: isValidUUID(targetChannelId) ? targetChannelId : null,
          title,
          message,
          action_url: body.actionUrl || body.action_url || null,
          payload: metadata,
        },
      });
      if (pushError) {
        console.warn("send-webpush dispatch note:", pushError);
      }
    } catch (pushErr) {
      console.warn("send-webpush dispatch error:", pushErr);
    }

    const responseNotification = {
      ...notification,
      channel: foundChannel || (targetChannelId ? { id: targetChannelId, name: "Channel" } : undefined),
    };

    return new Response(
      JSON.stringify({
        success: true,
        notification: responseNotification,
        latencyMs,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    const errorDetails = err?.message || err?.error_description || (typeof err === "object" ? JSON.stringify(err) : String(err));
    console.error("Webhook processing error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorDetails,
        code: err?.code || "INTERNAL_ERROR",
        hint: err?.hint || undefined,
        details: err?.details || undefined,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
