// Supabase Edge Function: send-notification
// Serves as the modern replacement for NestJS SendNotificationController & SendNotificationUseCase
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendNotificationDto {
  recipientId: string;
  title: string;
  content: string;
  category?: string;
  channel?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  payload?: Record<string, unknown>;
  actionUrl?: string;
  actionLabel?: string;
  sender?: {
    name: string;
    avatar?: string;
    role?: string;
  };
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

    // Parse request body
    const body: SendNotificationDto = await req.json();

    if (!body.recipientId || !body.title || !body.content) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: recipientId, title, content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const channel = body.channel || 'in_app';
    const category = body.category || 'system';
    const priority = body.priority || 'normal';

    // 1. Insert into public.notifications
    const { data: notification, error: insertError } = await supabase
      .from("notifications")
      .insert({
        recipient_id: body.recipientId,
        title: body.title,
        content: body.content,
        message: body.content,
        category: category,
        channel: channel,
        priority: priority,
        payload: body.payload || {},
        action_url: body.actionUrl || null,
        action_label: body.actionLabel || null,
        sender: body.sender || { name: "API Gateway", role: "Dispatcher" },
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    const latencyMs = Date.now() - startTime;

    // 2. Telemetry: Log to delivery_logs
    await supabase.from("delivery_logs").insert({
      notification_id: notification.id,
      channel: channel,
      status: "delivered",
      latency_ms: latencyMs,
      attempt_count: 1,
      provider: "supabase_edge_function",
      metadata: {
        dispatchedVia: "edge_function_http",
        recipientId: body.recipientId,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        notificationId: notification.id,
        latencyMs: latencyMs,
        notification: notification,
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
