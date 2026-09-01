-- ==============================================================================
-- SUPABASE MIGRATION: 20260301000000_add_missing_features_and_cleanup.sql
-- Parity Features: Unread Summary RPC, Expired Cleanup RPC & Cron, Admin User APIs
-- ==============================================================================

-- 1. RPC: Get Unread Summary by Channel
-- Returns per-channel unread counts, total counts, and last activity for the current user
CREATE OR REPLACE FUNCTION public.get_unread_summary_by_channel(p_user_id UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'channelId', c.id,
        'channelName', c.name,
        'description', c.description,
        'unreadCount', (
          SELECT COUNT(*) 
          FROM public.notifications n 
          WHERE n.channel_id = c.id 
            AND (n.read = false OR n.is_read = false)
            AND (n.expires_at IS NULL OR n.expires_at > timezone('utc'::text, now()))
        ),
        'totalCount', (
          SELECT COUNT(*) 
          FROM public.notifications n 
          WHERE n.channel_id = c.id 
            AND (n.expires_at IS NULL OR n.expires_at > timezone('utc'::text, now()))
        ),
        'lastNotificationAt', (
          SELECT MAX(n.created_at)
          FROM public.notifications n
          WHERE n.channel_id = c.id
        )
      )
      ORDER BY c.created_at DESC
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM public.channels c
  WHERE c.is_active = true
    AND (c.expires_at IS NULL OR c.expires_at > timezone('utc'::text, now()))
    AND (
      p_user_id IS NULL
      OR c.user_id = p_user_id 
      OR c.id IN (SELECT channel_id FROM public.channel_members WHERE user_id = p_user_id)
    );

  RETURN v_result;
END;
$$;

-- 2. RPC: Cleanup Expired Records (Notifications & Channels past TTL)
CREATE OR REPLACE FUNCTION public.cleanup_expired_records()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_notifications INTEGER := 0;
  v_deleted_channels INTEGER := 0;
BEGIN
  -- Delete expired notifications
  DELETE FROM public.notifications
  WHERE expires_at IS NOT NULL AND expires_at < timezone('utc'::text, now());
  GET DIAGNOSTICS v_deleted_notifications = ROW_COUNT;

  -- Delete expired channels (cascade deletes notifications & channel_members)
  DELETE FROM public.channels
  WHERE expires_at IS NOT NULL AND expires_at < timezone('utc'::text, now());
  GET DIAGNOSTICS v_deleted_channels = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'deletedNotificationsCount', v_deleted_notifications,
    'deletedChannelsCount', v_deleted_channels,
    'cleanedAt', timezone('utc'::text, now())
  );
END;
$$;

-- 3. Optional Cron Schedule with pg_cron (runs at 02:00 UTC daily if pg_cron is enabled)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-expired-notifications-daily',
      '0 2 * * *',
      'SELECT public.cleanup_expired_records();'
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron is not available on this instance or already configured.';
END $$;

-- 4. RPC: Admin Get Users List
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_users JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'createdAt', u.created_at,
        'lastSignInAt', u.last_sign_in_at,
        'role', COALESCE(u.raw_user_meta_data->>'role', 'user'),
        'name', COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
        'channelsCount', (SELECT COUNT(*) FROM public.channels c WHERE c.user_id = u.id),
        'pushDevicesCount', (SELECT COUNT(*) FROM public.push_subscriptions p WHERE p.user_id = u.id::text)
      )
      ORDER BY u.created_at DESC
    ),
    '[]'::jsonb
  ) INTO v_users
  FROM auth.users u;

  RETURN v_users;
END;
$$;

-- 5. RPC: Admin Delete User
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = p_user_id;
  RETURN jsonb_build_object('success', true, 'userId', p_user_id);
END;
$$;

-- 6. Trigger: Automatic Delivery Log on new Notification
CREATE OR REPLACE FUNCTION public.handle_new_notification_log()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.delivery_logs WHERE notification_id = NEW.id) THEN
    INSERT INTO public.delivery_logs (
      notification_id,
      channel,
      status,
      latency_ms,
      provider,
      metadata
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.channel, 'in_app'),
      'delivered',
      5,
      'supabase_wal_event',
      jsonb_build_object(
        'priority', NEW.priority,
        'category', NEW.category,
        'recipientId', NEW.recipient_id,
        'channelId', NEW.channel_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_on_notification_log ON public.notifications;
CREATE TRIGGER trg_on_notification_log
AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.handle_new_notification_log();
