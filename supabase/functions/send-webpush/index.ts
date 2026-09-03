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

    // 1. Set VAPID Details (Default to validated ECDSA P-256 keypair)
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:hoanxuanmai@gmail.com";
    const vapidPublicKey =
      Deno.env.get("VAPID_PUBLIC_KEY") ||
      "BGk-Oo8bIu07qVCWIg_v2HqI0T9wjoV2exOmVr5u49uSA9sZVpsUQybXh6lbyG9sEfsMSuwYLt3CpQr5-twwkwQ";
    const vapidPrivateKey =
      Deno.env.get("VAPID_PRIVATE_KEY") ||
      "ewuQQX5EifVp7zqrcQaf_-Oqg0nZ3V-VByMxxc-jPDY";

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // 2. Resolve target recipient users (Owner, Channel Members, or Explicit User)
    const candidateUserIds = new Set<string>();
    if (user_id) {
      candidateUserIds.add(user_id);
    }

    if (channel_id) {
      try {
        // Channel owner
        const { data: ch } = await supabase
          .from("channels")
          .select("user_id")
          .eq("id", channel_id)
          .maybeSingle();
        if (ch?.user_id) candidateUserIds.add(ch.user_id);

        // Channel members
        const { data: members } = await supabase
          .from("channel_members")
          .select("user_id")
          .eq("channel_id", channel_id);
        if (members && members.length > 0) {
          for (const m of members) {
            if (m.user_id) candidateUserIds.add(m.user_id);
          }
        }
      } catch (lookupErr) {
        console.warn("[send-webpush] Error looking up channel recipients:", lookupErr);
      }
    }

    // 3. Fetch active push subscriptions
    let query = supabase
      .from("push_subscriptions")
      .select("*")
      .eq("is_active", true);

    if (candidateUserIds.size > 0) {
      const userIdsList = Array.from(candidateUserIds).join(",");
      // Match explicit user IDs OR anonymous/guest device subscriptions (user_id IS NULL)
      query = query.or(`user_id.in.(${userIdsList}),user_id.is.null`);
    }

    const { data: subscriptions, error: subError } = await query;
    if (subError) {
      throw new Error(`Failed to query subscriptions: ${subError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("[send-webpush] No active push subscriptions found", {
        user_id,
        channel_id,
        candidateUserIds: Array.from(candidateUserIds),
      });
      return new Response(
        JSON.stringify({
          message: "No active push subscriptions found for target recipient",
          count: 0,
          candidateUserIds: Array.from(candidateUserIds),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`[send-webpush] Found ${subscriptions.length} active subscription(s) to dispatch.`);

    // 3. Construct WebPush payload
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

    // 4. Send push notification to all endpoints
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

          const res = await webpush.sendNotification(pushSubscription, pushPayload);
          console.log(`[send-webpush] Push delivered to ${sub.endpoint.slice(0, 35)}... (status: ${res.statusCode || 201})`);
          return res;
        } catch (err: any) {
          console.error(`[send-webpush] Delivery error for ${sub.endpoint.slice(0, 35)}...:`, err.message || err);
          // If subscription is expired or invalidated (HTTP 410 Gone / 404 Not Found)
          if (err.statusCode === 410 || err.statusCode === 404) {
            console.log(`[send-webpush] Removing expired subscription ${sub.id}`);
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
        details: results.map((r, idx) => ({
          id: subscriptions[idx]?.id,
          endpoint: subscriptions[idx]?.endpoint ? subscriptions[idx].endpoint.slice(0, 35) + '...' : '',
          status: r.status,
          error: r.status === 'rejected' ? (r as PromiseRejectedResult).reason?.message : undefined,
        })),
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
