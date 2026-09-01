// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This code runs as a Supabase Serverless Edge Function in Deno.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { notification_id, user_id, channel_id, title, message, action_url, payload, tag } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Set VAPID Details
    // Accept both naming conventions: VAPID_* (this function's original
    // names) and WEB_PUSH_* (the convention used everywhere else in this
    // project — .env files, the old NestJS backend, docs — and the one the
    // Supabase project secrets are actually set under).
    const vapidSubject =
      Deno.env.get("VAPID_SUBJECT") || Deno.env.get("WEB_PUSH_CONTACT_EMAIL") || "mailto:hoanxuanmai@gmail.com";
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") || Deno.env.get("WEB_PUSH_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") || Deno.env.get("WEB_PUSH_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error(
        "Missing VAPID keys: set VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY (or WEB_PUSH_PUBLIC_KEY/WEB_PUSH_PRIVATE_KEY) as Supabase project secrets."
      );
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // 2. Resolve the set of recipient user ids.
    //    - explicit user_id from the caller (if any)
    //    - when the notification belongs to a channel: the channel owner
    //      plus every channel_members row for that channel
    // No channel and no user_id => nobody (never broadcast to all subs).
    const recipientIds = new Set<string>();
    if (typeof user_id === "string" && user_id) {
      recipientIds.add(user_id);
    }

    if (typeof channel_id === "string" && channel_id) {
      const [{ data: channelRow, error: channelErr }, { data: memberRows, error: memberErr }] =
        await Promise.all([
          supabase.from("channels").select("user_id").eq("id", channel_id).maybeSingle(),
          supabase.from("channel_members").select("user_id").eq("channel_id", channel_id),
        ]);

      if (channelErr) throw new Error(`Failed to load channel: ${channelErr.message}`);
      if (memberErr) throw new Error(`Failed to load channel members: ${memberErr.message}`);

      if (channelRow?.user_id) recipientIds.add(channelRow.user_id as string);
      for (const m of memberRows ?? []) {
        if (m?.user_id) recipientIds.add(m.user_id as string);
      }
    }

    if (recipientIds.size === 0) {
      return new Response(
        JSON.stringify({
          message: "No recipients resolved (need user_id and/or a channel_id with an owner/members)",
          count: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // 3. Fetch active push subscriptions for those recipients.
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("is_active", true)
      .in("user_id", Array.from(recipientIds));

    if (subError) {
      throw new Error(`Failed to query subscriptions: ${subError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No active push subscriptions found for the resolved recipients",
          recipientCount: recipientIds.size,
          count: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // 4. Construct WebPush payload
    const pushPayload = JSON.stringify({
      title: title || "New Notification",
      body: message || "You have a new update",
      icon: "/icon.png",
      badge: "/badge.png",
      tag: tag || "app-notif",
      data: {
        url: action_url || "/",
        notificationId: notification_id,
        channelId: channel_id,
        timestamp: Date.now(),
        extra: payload || {},
      },
      actions: [
        { action: "explore", title: "View Details" },
        { action: "dismiss", title: "Dismiss" },
      ],
      vibrate: [200, 100, 200],
    });

    // 5. Send push notification to all endpoints
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth_token,
            },
          };

          return await webpush.sendNotification(pushSubscription, pushPayload);
        } catch (err: any) {
          // If subscription is expired or invalidated (HTTP 410 Gone / 404 Not Found)
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          }
          throw err;
        }
      })
    );

    const deliveredCount = results.filter((r) => r.status === "fulfilled").length;
    const failedCount = results.filter((r) => r.status === "rejected").length;

    return new Response(
      JSON.stringify({
        success: true,
        deliveredCount,
        failedCount,
        totalSubscriptions: subscriptions.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
