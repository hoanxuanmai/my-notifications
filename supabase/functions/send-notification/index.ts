// Supabase Edge Function: send-notification
// Replaces NestJS SendNotificationController & NotificationsService.create
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  priority?: 'low' | 'normal' | 'medium' | 'high' | 'urgent';
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

    // Extract params from URL (Path parameter or Query string)
    const reqUrl = new URL(req.url);
    const pathParts = reqUrl.pathname.split("/").filter(Boolean);
    // e.g. /functions/v1/send-notification/webhook_token_xxx or /functions/v1/send-notification
    const lastPathSegment = pathParts[pathParts.length - 1];
    const pathToken = lastPathSegment && lastPathSegment !== "send-notification" && lastPathSegment !== "v1" ? lastPathSegment : null;

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
        JSON.stringify({ error: "Missing required fields: title, and message/content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let targetChannelId = body.channelId || body.channel_id || queryChannelId || null;
    const webhookToken = body.webhookToken || body.webhook_token || queryToken || pathToken || headerToken || null;
    let targetUserId = body.userId || body.user_id || null;
    const targetRecipientId = body.recipientId || body.recipient_id || targetUserId || (targetChannelId ? `channel:${targetChannelId}` : 'broadcast');

    // If webhook token is provided, look up channel
    if (webhookToken && !targetChannelId) {
      const { data: foundChannel, error: channelError } = await supabase
        .from("channels")
        .select("id, user_id, name, is_active, expires_at")
        .eq("webhook_token", webhookToken)
        .single();

      if (channelError || !foundChannel) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired webhookToken" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      targetChannelId = foundChannel.id;
      if (!targetUserId) {
        targetUserId = foundChannel.user_id;
      }
    }

    // If targetChannelId is provided, verify channel exists
    if (targetChannelId) {
      const { data: ch } = await supabase
        .from("channels")
        .select("id, user_id, name")
        .eq("id", targetChannelId)
        .single();

      if (ch && !targetUserId) {
        targetUserId = ch.user_id;
      }
    }

    const deliveryChannel = body.channel || 'in_app';
    const notifType = body.type || 'info';
    const priority = body.priority || 'medium';
    const category = body.category || 'system';
    const metadata = body.metadata || body.payload || {};
    const ttlDays = body.ttlDays || 3;
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();

    // 1. Insert into public.notifications
    const { data: notification, error: insertError } = await supabase
      .from("notifications")
      .insert({
        channel_id: targetChannelId,
        user_id: targetUserId,
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
      .select(`
        *,
        channel:channels (
          id,
          name,
          description,
          webhook_token,
          user_id
        )
      `)
      .single();

    if (insertError) {
      throw insertError;
    }

    const latencyMs = Date.now() - startTime;

    // 2. Telemetry: Log to delivery_logs
    await supabase.from("delivery_logs").insert({
      notification_id: notification.id,
      channel: deliveryChannel,
      status: "delivered",
      latency_ms: latencyMs,
      attempt_count: 1,
      provider: "supabase_edge_function",
      metadata: {
        dispatchedVia: "edge_function_send_notification",
        channelId: targetChannelId,
        recipientId: targetRecipientId,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        notification,
        latencyMs,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
