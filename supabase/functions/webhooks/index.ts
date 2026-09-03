// Supabase Edge Function: webhooks
// High-performance, low-latency webhook ingestion for notification events
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-channel-token, x-webhook-token, x-token, x-return-full",
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
  priority?: 'low' | 'normal' | 'medium' | 'high' | 'urgent' | string;
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

declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void } | undefined;

function runInBackground(promise: Promise<unknown>): void {
  if (typeof EdgeRuntime !== "undefined" && typeof EdgeRuntime?.waitUntil === "function") {
    EdgeRuntime.waitUntil(promise);
  } else {
    // Fire and forget without blocking event loop
    promise.catch((err) => {
      console.warn("[Background Task Warning]:", err);
    });
  }
}

function isValidUUID(str: unknown): boolean {
  if (typeof str !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// In-memory cache for channel resolution (valid for 5 minutes per Edge Function worker)
interface CachedChannel {
  id: string;
  userId: string | null;
  expiresAtMs: number;
}
const channelCache = new Map<string, CachedChannel>();
const CHANNEL_CACHE_TTL_MS = 5 * 60 * 1000;

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
    // e.g. /functions/v1/webhooks/:token
    const lastPathSegment = pathParts[pathParts.length - 1];
    const pathToken =
      lastPathSegment &&
      lastPathSegment !== "webhooks" &&
      lastPathSegment !== "send-notification" &&
      lastPathSegment !== "v1"
        ? lastPathSegment
        : null;

    const queryToken =
      reqUrl.searchParams.get("token") ||
      reqUrl.searchParams.get("webhookToken") ||
      reqUrl.searchParams.get("webhook_token");
    const queryChannelId =
      reqUrl.searchParams.get("channel_id") ||
      reqUrl.searchParams.get("channelId") ||
      reqUrl.searchParams.get("id");
    const headerToken =
      req.headers.get("x-channel-token") ||
      req.headers.get("x-webhook-token") ||
      req.headers.get("x-token");

    // Check if client explicitly requests full data payload (default is false for maximum performance)
    const wantFullData =
      reqUrl.searchParams.get("full") === "true" ||
      reqUrl.searchParams.get("include_data") === "true" ||
      req.headers.get("x-return-full") === "true";

    // Parse request body
    const body: SendNotificationPayload = await req.json().catch(() => ({
      title: "Webhook Alert",
      message: "Incoming webhook trigger",
    }));

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
    const webhookToken =
      body.webhookToken || body.webhook_token || queryToken || pathToken || headerToken || null;
    let targetUserId = body.userId || body.user_id || null;

    // 1. Channel Resolution with in-memory caching (reduces round-trip to database)
    if (webhookToken && !targetChannelId) {
      const now = Date.now();
      const cached = channelCache.get(webhookToken);

      if (cached && cached.expiresAtMs > now) {
        targetChannelId = cached.id;
        if (!targetUserId && cached.userId) {
          targetUserId = cached.userId;
        }
      } else {
        // Look up only the 2 required columns from channels
        const { data: ch } = await supabase
          .from("channels")
          .select("id, user_id")
          .eq("webhook_token", webhookToken)
          .maybeSingle();

        if (ch) {
          targetChannelId = ch.id;
          if (!targetUserId && ch.user_id) {
            targetUserId = ch.user_id;
          }
          channelCache.set(webhookToken, {
            id: ch.id,
            userId: ch.user_id,
            expiresAtMs: now + CHANNEL_CACHE_TTL_MS,
          });
        } else if (isValidUUID(webhookToken)) {
          targetChannelId = webhookToken;
        }
      }
    }

    const targetRecipientId =
      body.recipientId ||
      body.recipient_id ||
      (targetUserId ? String(targetUserId) : null) ||
      (targetChannelId ? `channel:${targetChannelId}` : "broadcast");

    const deliveryChannel = String(body.channel || "in_app").toLowerCase();
    const notifType = String(body.type || "info").toLowerCase();
    const priority = String(body.priority || "medium").toLowerCase();
    const category = String(body.category || "system").toLowerCase();
    const metadata = body.metadata || body.payload || {};
    const ttlDays = body.ttlDays || 3;
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();

    // 2. High-Performance Insert:
    // When wantFullData is false, only select('id, created_at') to avoid Postgres RETURNING * overhead
    const insertPayload = {
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
    };

    const insertQuery = supabase.from("notifications").insert(insertPayload);
    const { data: notification, error: insertError } = wantFullData
      ? await insertQuery.select().single()
      : await insertQuery.select("id, created_at").single();

    if (insertError) {
      throw insertError;
    }

    const latencyMs = Date.now() - startTime;

    // 3. Telemetry & Web Push: Non-blocking background worker
    runInBackground(
      Promise.allSettled([
        supabase.from("delivery_logs").insert({
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
        }),
        supabase.functions.invoke("send-webpush", {
          body: {
            notification_id: notification.id,
            user_id: isValidUUID(targetUserId) ? targetUserId : null,
            channel_id: isValidUUID(targetChannelId) ? targetChannelId : null,
            title,
            message,
            action_url: body.actionUrl || body.action_url || null,
            payload: metadata,
          },
        }),
      ]).catch((bgErr) => {
        console.warn("[Background Tasks Warning]:", bgErr);
      })
    );

    // 4. Return fast response (lean acknowledgement by default, full data only if requested)
    if (wantFullData) {
      return new Response(
        JSON.stringify({
          success: true,
          notification,
          latencyMs,
        }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: notification.id,
        channelId: targetChannelId,
        createdAt: notification.created_at,
        latencyMs,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    const errorDetails =
      err?.message ||
      err?.error_description ||
      (typeof err === "object" ? JSON.stringify(err) : String(err));
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
