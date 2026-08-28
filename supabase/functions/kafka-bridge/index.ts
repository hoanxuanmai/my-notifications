// Supabase Edge Function: kafka-bridge
// Ingests events from Kafka microservices / Upstash / Webhooks and routes to Supabase Channel Realtime
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface KafkaEventPayload {
  topic: string;
  partition?: number;
  offset?: number;
  key?: string;
  value: {
    channelId?: string;
    channel_id?: string;
    webhookToken?: string;
    webhook_token?: string;
    recipientId?: string;
    recipient_id?: string;
    userId?: string;
    templateSlug?: string;
    title?: string;
    content?: string;
    message?: string;
    type?: string;
    priority?: string;
    category?: string;
    variables?: Record<string, string>;
    payload?: Record<string, unknown>;
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const event: KafkaEventPayload = await req.json();

    if (!event.value) {
      return new Response(
        JSON.stringify({ error: "Invalid Kafka event structure. Expected .value object" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let targetChannelId = event.value.channelId || event.value.channel_id || null;
    const webhookToken = event.value.webhookToken || event.value.webhook_token || null;
    let targetUserId = event.value.userId || null;
    const recipientId = event.value.recipientId || event.value.recipient_id || (targetChannelId ? `channel:${targetChannelId}` : 'broadcast');

    // If webhook token provided, lookup channel
    if (webhookToken && !targetChannelId) {
      const { data: ch } = await supabase
        .from("channels")
        .select("id, user_id, name")
        .eq("webhook_token", webhookToken)
        .single();
      if (ch) {
        targetChannelId = ch.id;
        targetUserId = ch.user_id;
      }
    }

    let finalTitle = event.value.title || `Event from ${event.topic || 'Kafka'}`;
    let finalMessage = event.value.message || event.value.content || `Kafka event processed for topic: ${event.topic || 'stream'}`;

    // If template slug provided, attempt template resolution
    if (event.value.templateSlug) {
      const { data: template } = await supabase
        .from("notification_templates")
        .select("*")
        .eq("slug", event.value.templateSlug)
        .single();

      if (template) {
        let compiledTitle = template.title_template;
        let compiledBody = template.body_template;
        const vars = event.value.variables || {};

        Object.entries(vars).forEach(([k, v]) => {
          compiledTitle = compiledTitle.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
          compiledBody = compiledBody.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
        });

        finalTitle = compiledTitle;
        finalMessage = compiledBody;
      }
    }

    // Insert Notification
    const { data: notification, error } = await supabase
      .from("notifications")
      .insert({
        channel_id: targetChannelId,
        user_id: targetUserId,
        recipient_id: recipientId,
        title: finalTitle,
        content: finalMessage,
        message: finalMessage,
        type: event.value.type || 'info',
        priority: event.value.priority || 'high',
        category: event.value.category || 'tasks',
        channel: 'in_app',
        read: false,
        is_read: false,
        metadata: {
          kafkaTopic: event.topic,
          kafkaPartition: event.partition,
          kafkaOffset: event.offset,
          ...(event.value.payload || {}),
        },
        payload: {
          kafkaTopic: event.topic,
          kafkaPartition: event.partition,
          kafkaOffset: event.offset,
          ...(event.value.payload || {}),
        },
        sender: {
          name: `Kafka [${event.topic || 'events'}]`,
          role: "Event Stream",
        },
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        notificationId: notification.id,
        channelId: targetChannelId,
        topic: event.topic,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
