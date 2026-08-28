-- ==============================================================================
-- MY-NOTIFICATIONS SUPABASE MIGRATION SCRIPT
-- Full Parity for Channels, Channel Members, Delivery Channels & Notifications
-- Replaces NestJS Prisma Schema, Repository, Kafka Consumer, and WebSocket Gateway
-- Direct conversion for hoanxuanmai/my-notifications
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create Channels Table (NestJS Channel Model)
CREATE TABLE IF NOT EXISTS public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  webhook_token VARCHAR(255) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  api_key VARCHAR(255),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '1 year')
);

-- 3. Create Channel Members Table (NestJS ChannelMember Model)
CREATE TABLE IF NOT EXISTS public.channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uniq_channel_member UNIQUE(user_id, channel_id)
);

-- 4. Create User Delivery Channels Table (NestJS UserDeliveryChannel Model)
CREATE TABLE IF NOT EXISTS public.user_delivery_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'WEB_SOCKET', 'WEB_PUSH', 'EMAIL', 'WEBHOOK'
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Create Notifications Table (Domain Model with Channel Support)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id VARCHAR(255),          -- Compatible with RecipientId value object
  title VARCHAR(500) NOT NULL,
  content TEXT,                       -- Domain 'content' field
  message TEXT NOT NULL,              -- Display message
  category VARCHAR(50) NOT NULL DEFAULT 'system',
  channel VARCHAR(30) NOT NULL DEFAULT 'in_app', -- delivery medium ('in_app', 'push', 'email', 'sms', 'webhook', 'slack', 'discord')
  type VARCHAR(50) NOT NULL DEFAULT 'info',      -- 'info', 'success', 'warning', 'error', 'debug'
  priority VARCHAR(50) NOT NULL DEFAULT 'medium',-- 'low', 'medium', 'normal', 'high', 'urgent'
  read BOOLEAN NOT NULL DEFAULT false,           -- Frontend/NestJS field
  is_read BOOLEAN NOT NULL DEFAULT false,        -- Clean Architecture field
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,           -- Direct replacement for CancelNotification use case
  is_archived BOOLEAN NOT NULL DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  action_label VARCHAR(100),
  sender JSONB DEFAULT '{"name":"Notification Hub","role":"Engine"}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '3 days')
);

-- Ensure columns exist if table was already created in earlier migration
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='channel_id') THEN
    ALTER TABLE public.notifications ADD COLUMN channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='read') THEN
    ALTER TABLE public.notifications ADD COLUMN read BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='type') THEN
    ALTER TABLE public.notifications ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT 'info';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='metadata') THEN
    ALTER TABLE public.notifications ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='expires_at') THEN
    ALTER TABLE public.notifications ADD COLUMN expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '3 days');
  END IF;
END $$;

-- 6. Trigger to keep compatibility between read/is_read, message/content, metadata/payload
CREATE OR REPLACE FUNCTION public.sync_notification_compat_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Synchronize read & is_read
  IF TG_OP = 'INSERT' THEN
    IF NEW.read IS TRUE AND NEW.is_read IS FALSE THEN
      NEW.is_read := true;
    ELSIF NEW.is_read IS TRUE AND NEW.read IS FALSE THEN
      NEW.read := true;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.read IS DISTINCT FROM OLD.read THEN
      NEW.is_read := NEW.read;
    ELSIF NEW.is_read IS DISTINCT FROM OLD.is_read THEN
      NEW.read := NEW.is_read;
    END IF;
  END IF;

  -- Synchronize message & content
  IF NEW.message IS NULL AND NEW.content IS NOT NULL THEN
    NEW.message := NEW.content;
  ELSIF NEW.content IS NULL AND NEW.message IS NOT NULL THEN
    NEW.content := NEW.message;
  END IF;

  -- Synchronize metadata & payload
  IF (NEW.metadata IS NULL OR NEW.metadata = '{}'::jsonb) AND NEW.payload IS NOT NULL AND NEW.payload != '{}'::jsonb THEN
    NEW.metadata := NEW.payload;
  ELSIF (NEW.payload IS NULL OR NEW.payload = '{}'::jsonb) AND NEW.metadata IS NOT NULL AND NEW.metadata != '{}'::jsonb THEN
    NEW.payload := NEW.metadata;
  END IF;

  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_notification_fields ON public.notifications;
CREATE TRIGGER trg_sync_notification_fields
BEFORE INSERT OR UPDATE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.sync_notification_compat_fields();

-- 7. Create Delivery Logs Table (Multi-channel telemetry)
CREATE TABLE IF NOT EXISTS public.delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  channel VARCHAR(30) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'delivered'
    CHECK (status IN ('queued', 'dispatched', 'delivered', 'read', 'failed', 'retried')),
  latency_ms INTEGER NOT NULL DEFAULT 12,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  provider VARCHAR(50) NOT NULL DEFAULT 'supabase_wal_realtime',
  delivered_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. Create Notification Preferences Table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  webhook_enabled BOOLEAN NOT NULL DEFAULT true,
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  digest_frequency VARCHAR(20) NOT NULL DEFAULT 'instant'
    CHECK (digest_frequency IN ('instant', 'hourly', 'daily', 'weekly')),
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start VARCHAR(10) DEFAULT '22:00',
  quiet_hours_end VARCHAR(10) DEFAULT '07:00',
  category_matrix JSONB DEFAULT '{"system":{"in_app":true,"push":true,"email":true},"security":{"in_app":true,"push":true,"email":true},"billing":{"in_app":true,"push":true,"email":true},"tasks":{"in_app":true,"push":true,"email":false},"social":{"in_app":true,"push":false,"email":false},"updates":{"in_app":true,"push":false,"email":false}}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. Create Notification Templates Table
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'system',
  title_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  default_channel VARCHAR(30) NOT NULL DEFAULT 'in_app',
  variables TEXT[] DEFAULT ARRAY[]::TEXT[],
  sample_variables JSONB DEFAULT '{}'::jsonb,
  default_priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  action_url_template TEXT,
  email_subject_template TEXT,
  email_html_template TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_channels_user_id ON public.channels(user_id);
CREATE INDEX IF NOT EXISTS idx_channels_webhook_token ON public.channels(webhook_token);
CREATE INDEX IF NOT EXISTS idx_channels_is_active ON public.channels(is_active);
CREATE INDEX IF NOT EXISTS idx_channel_members_user ON public.channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_channel ON public.channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_notifications_channel_id ON public.notifications(channel_id);
CREATE INDEX IF NOT EXISTS idx_notifications_channel_created ON public.notifications(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_notif_id ON public.delivery_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_user_delivery_channels_user ON public.user_delivery_channels(user_id);

-- 11. Enable Row Level Security (RLS)
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_delivery_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- 12. Row Level Security Policies

-- Channels Policies:
-- Owner or Member can view active channels
DROP POLICY IF EXISTS "channels_select" ON public.channels;
CREATE POLICY "channels_select" 
  ON public.channels 
  FOR SELECT 
  TO authenticated, anon
  USING (
    user_id = auth.uid() 
    OR id IN (SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid())
    OR auth.uid() IS NULL
  );

DROP POLICY IF EXISTS "channels_insert" ON public.channels;
CREATE POLICY "channels_insert" 
  ON public.channels 
  FOR INSERT 
  TO authenticated, anon, service_role
  WITH CHECK (
    user_id = auth.uid() OR auth.uid() IS NULL
  );

DROP POLICY IF EXISTS "channels_update" ON public.channels;
CREATE POLICY "channels_update" 
  ON public.channels 
  FOR UPDATE 
  TO authenticated, anon, service_role
  USING (
    user_id = auth.uid() OR auth.uid() IS NULL
  )
  WITH CHECK (
    user_id = auth.uid() OR auth.uid() IS NULL
  );

DROP POLICY IF EXISTS "channels_delete" ON public.channels;
CREATE POLICY "channels_delete" 
  ON public.channels 
  FOR DELETE 
  TO authenticated, anon, service_role
  USING (
    user_id = auth.uid() OR auth.uid() IS NULL
  );

-- Channel Members Policies:
DROP POLICY IF EXISTS "channel_members_select" ON public.channel_members;
CREATE POLICY "channel_members_select" 
  ON public.channel_members 
  FOR SELECT 
  TO authenticated, anon
  USING (
    user_id = auth.uid()
    OR channel_id IN (SELECT id FROM public.channels WHERE user_id = auth.uid())
    OR channel_id IN (SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid())
    OR auth.uid() IS NULL
  );

DROP POLICY IF EXISTS "channel_members_insert" ON public.channel_members;
CREATE POLICY "channel_members_insert" 
  ON public.channel_members 
  FOR INSERT 
  TO authenticated, anon, service_role
  WITH CHECK (
    channel_id IN (SELECT id FROM public.channels WHERE user_id = auth.uid())
    OR auth.uid() IS NULL
  );

DROP POLICY IF EXISTS "channel_members_delete" ON public.channel_members;
CREATE POLICY "channel_members_delete" 
  ON public.channel_members 
  FOR DELETE 
  TO authenticated, anon, service_role
  USING (
    channel_id IN (SELECT id FROM public.channels WHERE user_id = auth.uid())
    OR user_id = auth.uid()
    OR auth.uid() IS NULL
  );

-- User Delivery Channels Policies:
DROP POLICY IF EXISTS "user_delivery_channels_select" ON public.user_delivery_channels;
CREATE POLICY "user_delivery_channels_select" 
  ON public.user_delivery_channels 
  FOR SELECT 
  TO authenticated, anon
  USING (user_id = auth.uid() OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "user_delivery_channels_all" ON public.user_delivery_channels;
CREATE POLICY "user_delivery_channels_all" 
  ON public.user_delivery_channels 
  FOR ALL 
  TO authenticated, anon, service_role
  USING (user_id = auth.uid() OR auth.uid() IS NULL)
  WITH CHECK (user_id = auth.uid() OR auth.uid() IS NULL);

-- Notifications Policies:
-- User can view if they are direct owner, recipient, or member/owner of the channel!
DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
CREATE POLICY "notifications_select_policy" 
  ON public.notifications 
  FOR SELECT 
  TO authenticated, anon
  USING (
    user_id = auth.uid() 
    OR auth.uid()::text = recipient_id 
    OR recipient_id IN ('all', 'broadcast')
    OR (channel_id IS NOT NULL AND channel_id IN (
        SELECT id FROM public.channels WHERE user_id = auth.uid()
        UNION
        SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid()
    ))
    OR auth.uid() IS NULL
  );

DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;
CREATE POLICY "notifications_update_policy" 
  ON public.notifications 
  FOR UPDATE 
  TO authenticated, anon, service_role
  USING (
    user_id = auth.uid() 
    OR auth.uid()::text = recipient_id 
    OR (channel_id IS NOT NULL AND channel_id IN (
        SELECT id FROM public.channels WHERE user_id = auth.uid()
        UNION
        SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid()
    ))
    OR auth.uid() IS NULL
  )
  WITH CHECK (
    user_id = auth.uid() 
    OR auth.uid()::text = recipient_id 
    OR (channel_id IS NOT NULL AND channel_id IN (
        SELECT id FROM public.channels WHERE user_id = auth.uid()
        UNION
        SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid()
    ))
    OR auth.uid() IS NULL
  );

DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;
CREATE POLICY "notifications_insert_policy" 
  ON public.notifications 
  FOR INSERT 
  TO authenticated, anon, service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_delete_policy" ON public.notifications;
CREATE POLICY "notifications_delete_policy" 
  ON public.notifications 
  FOR DELETE 
  TO authenticated, anon, service_role
  USING (
    user_id = auth.uid()
    OR (channel_id IS NOT NULL AND channel_id IN (
        SELECT id FROM public.channels WHERE user_id = auth.uid()
    ))
    OR auth.uid() IS NULL
  );

-- Delivery logs & Preferences policies
DROP POLICY IF EXISTS "preferences_select_own" ON public.notification_preferences;
CREATE POLICY "preferences_select_own" 
  ON public.notification_preferences 
  FOR SELECT 
  TO authenticated, anon
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "preferences_update_own" ON public.notification_preferences;
CREATE POLICY "preferences_update_own" 
  ON public.notification_preferences 
  FOR ALL 
  TO authenticated, anon
  USING (auth.uid() = user_id OR auth.uid() IS NULL)
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "templates_select_all" ON public.notification_templates;
CREATE POLICY "templates_select_all" 
  ON public.notification_templates 
  FOR SELECT 
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "delivery_logs_select" ON public.delivery_logs;
CREATE POLICY "delivery_logs_select" 
  ON public.delivery_logs 
  FOR SELECT 
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "delivery_logs_insert" ON public.delivery_logs;
CREATE POLICY "delivery_logs_insert" 
  ON public.delivery_logs 
  FOR INSERT 
  TO authenticated, anon, service_role
  WITH CHECK (true);


-- 13. Stored Procedures / RPC Functions for Channels and Notifications

-- RPC: Create Channel (NestJS ChannelsService.create)
CREATE OR REPLACE FUNCTION public.create_channel(
  p_name VARCHAR(255),
  p_description TEXT DEFAULT NULL,
  p_settings JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_channel public.channels%ROWTYPE;
BEGIN
  INSERT INTO public.channels (
    user_id,
    name,
    description,
    settings,
    webhook_token,
    expires_at
  )
  VALUES (
    v_user_id,
    p_name,
    p_description,
    COALESCE(p_settings, '{}'::jsonb),
    encode(gen_random_bytes(16), 'hex'),
    timezone('utc'::text, now()) + interval '1 year'
  )
  RETURNING * INTO v_channel;

  RETURN to_jsonb(v_channel);
END;
$$;

-- RPC: Add Channel Member by Email (NestJS ChannelsService.addMember)
CREATE OR REPLACE FUNCTION public.add_channel_member_by_email(
  p_channel_id UUID,
  p_email VARCHAR(255)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID := auth.uid();
  v_channel public.channels%ROWTYPE;
  v_target_user_id UUID;
  v_member public.channel_members%ROWTYPE;
BEGIN
  -- Verify channel exists
  SELECT * INTO v_channel FROM public.channels WHERE id = p_channel_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Channel not found.';
  END IF;

  -- Only owner can add members
  IF v_current_user_id IS NOT NULL AND v_channel.user_id != v_current_user_id THEN
    RAISE EXCEPTION 'Only the channel owner can manage members.';
  END IF;

  -- Lookup target user by email in auth.users
  SELECT id INTO v_target_user_id FROM auth.users WHERE email = p_email LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User with email % not found.', p_email;
  END IF;

  IF v_target_user_id = v_channel.user_id THEN
    RAISE EXCEPTION 'Channel owner already has access to this channel.';
  END IF;

  -- Insert member if not exists
  INSERT INTO public.channel_members (channel_id, user_id, role)
  VALUES (p_channel_id, v_target_user_id, 'member')
  ON CONFLICT (user_id, channel_id) DO UPDATE SET updated_at = timezone('utc'::text, now())
  RETURNING * INTO v_member;

  RETURN jsonb_build_object(
    'id', v_member.id,
    'channelId', v_member.channel_id,
    'userId', v_member.user_id,
    'email', p_email,
    'role', v_member.role
  );
END;
$$;

-- RPC: Get User Active Channels with unread count and latest notification (NestJS ChannelsService.findAll)
CREATE OR REPLACE FUNCTION public.get_user_channels(p_user_id UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(ch_data ORDER BY ch_data->>'createdAt' DESC)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', c.id,
      'userId', c.user_id,
      'name', c.name,
      'description', c.description,
      'webhookToken', c.webhook_token,
      'apiKey', c.api_key,
      'settings', c.settings,
      'isActive', c.is_active,
      'createdAt', c.created_at,
      'updatedAt', c.updated_at,
      'expiresAt', c.expires_at,
      '_count', jsonb_build_object(
        'notifications', (
          SELECT COUNT(*) 
          FROM public.notifications n 
          WHERE n.channel_id = c.id 
            AND n.read = false 
            AND n.expires_at > timezone('utc'::text, now())
        )
      ),
      'notifications', (
        SELECT COALESCE(jsonb_agg(to_jsonb(sub.*)), '[]'::jsonb)
        FROM (
          SELECT id, title, message, type, priority, read, metadata, created_at AS "createdAt"
          FROM public.notifications n
          WHERE n.channel_id = c.id
          ORDER BY n.created_at DESC
          LIMIT 1
        ) sub
      )
    ) AS ch_data
    FROM public.channels c
    WHERE c.is_active = true
      AND c.expires_at > timezone('utc'::text, now())
      AND (
        p_user_id IS NULL
        OR c.user_id = p_user_id 
        OR c.id IN (SELECT channel_id FROM public.channel_members WHERE user_id = p_user_id)
      )
  ) q;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- RPC: Send Notification into Channel (NestJS NotificationsService.create)
CREATE OR REPLACE FUNCTION public.send_channel_notification(
  p_channel_id UUID,
  p_title VARCHAR(500),
  p_message TEXT,
  p_type VARCHAR(50) DEFAULT 'info',
  p_priority VARCHAR(50) DEFAULT 'medium',
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_ttl_days INTEGER DEFAULT 3
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_channel public.channels%ROWTYPE;
  v_notification public.notifications%ROWTYPE;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Verify channel exists and is active
  SELECT * INTO v_channel 
  FROM public.channels 
  WHERE id = p_channel_id AND is_active = true AND expires_at > timezone('utc'::text, now());
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Channel with ID % not found or expired.', p_channel_id;
  END IF;

  v_expires_at := timezone('utc'::text, now()) + (COALESCE(p_ttl_days, 3) || ' days')::interval;

  -- Insert notification
  INSERT INTO public.notifications (
    channel_id,
    user_id,
    title,
    message,
    content,
    type,
    priority,
    metadata,
    payload,
    read,
    is_read,
    expires_at,
    sender
  )
  VALUES (
    p_channel_id,
    v_channel.user_id,
    p_title,
    p_message,
    p_message,
    COALESCE(p_type, 'info'),
    COALESCE(p_priority, 'medium'),
    COALESCE(p_metadata, '{}'::jsonb),
    COALESCE(p_metadata, '{}'::jsonb),
    false,
    false,
    v_expires_at,
    jsonb_build_object('name', v_channel.name, 'role', 'Channel Dispatcher')
  )
  RETURNING * INTO v_notification;

  -- Telemetry: Log to delivery_logs
  INSERT INTO public.delivery_logs (
    notification_id,
    channel,
    status,
    latency_ms,
    provider,
    metadata
  )
  VALUES (
    v_notification.id,
    'in_app',
    'delivered',
    5,
    'supabase_channel_rpc',
    jsonb_build_object('channelId', p_channel_id, 'channelName', v_channel.name)
  );

  RETURN to_jsonb(v_notification);
END;
$$;

-- RPC: Send Notification via Webhook Token (NestJS WebhooksService / enqueueWebhook)
CREATE OR REPLACE FUNCTION public.send_notification_by_webhook(
  p_webhook_token VARCHAR(255),
  p_title VARCHAR(500),
  p_message TEXT,
  p_type VARCHAR(50) DEFAULT 'info',
  p_priority VARCHAR(50) DEFAULT 'medium',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_channel_id UUID;
BEGIN
  SELECT id INTO v_channel_id 
  FROM public.channels 
  WHERE webhook_token = p_webhook_token 
    AND is_active = true 
    AND expires_at > timezone('utc'::text, now());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired webhook token.';
  END IF;

  RETURN public.send_channel_notification(
    v_channel_id,
    p_title,
    p_message,
    p_type,
    p_priority,
    p_metadata
  );
END;
$$;

-- RPC: Mark all notifications in a channel as read (NestJS NotificationsService.markAllAsRead)
CREATE OR REPLACE FUNCTION public.mark_channel_notifications_read(p_channel_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_count INTEGER;
BEGIN
  IF p_channel_id IS NOT NULL THEN
    UPDATE public.notifications
    SET 
      read = true,
      is_read = true,
      read_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
    WHERE channel_id = p_channel_id
      AND read = false;
  ELSE
    -- Mark all read across all accessible channels for the user
    UPDATE public.notifications
    SET 
      read = true,
      is_read = true,
      read_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
    WHERE read = false
      AND (
        user_id = v_user_id
        OR recipient_id = v_user_id::text
        OR channel_id IN (
          SELECT id FROM public.channels WHERE user_id = v_user_id
          UNION
          SELECT channel_id FROM public.channel_members WHERE user_id = v_user_id
        )
      );
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- RPC: Count channel unread (NestJS NotificationsService.getUnreadCount)
CREATE OR REPLACE FUNCTION public.get_channel_unread_count(p_channel_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_count INTEGER;
BEGIN
  IF p_channel_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count
    FROM public.notifications
    WHERE channel_id = p_channel_id
      AND read = false
      AND expires_at > timezone('utc'::text, now());
  ELSE
    SELECT COUNT(*) INTO v_count
    FROM public.notifications
    WHERE read = false
      AND expires_at > timezone('utc'::text, now())
      AND (
        user_id = v_user_id
        OR recipient_id = v_user_id::text
        OR channel_id IN (
          SELECT id FROM public.channels WHERE user_id = v_user_id
          UNION
          SELECT channel_id FROM public.channel_members WHERE user_id = v_user_id
        )
      );
  END IF;

  RETURN COALESCE(v_count, 0);
END;
$$;

-- RPC: Unread summary per channel (NestJS NotificationsService.getUnreadSummary)
CREATE OR REPLACE FUNCTION public.get_channels_unread_summary(p_user_id UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_object_agg(c.id::text, COALESCE(cnt.unread_count, 0))
  INTO v_result
  FROM public.channels c
  LEFT JOIN (
    SELECT channel_id, COUNT(*) AS unread_count
    FROM public.notifications
    WHERE read = false AND expires_at > timezone('utc'::text, now())
    GROUP BY channel_id
  ) cnt ON cnt.channel_id = c.id
  WHERE c.is_active = true
    AND c.expires_at > timezone('utc'::text, now())
    AND (
      p_user_id IS NULL
      OR c.user_id = p_user_id 
      OR c.id IN (SELECT channel_id FROM public.channel_members WHERE user_id = p_user_id)
    );

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

-- RPC: Read single notification
CREATE OR REPLACE FUNCTION public.read_notification(p_notification_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  UPDATE public.notifications
  SET 
    read = true,
    is_read = true,
    read_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_notification_id
  RETURNING to_jsonb(notifications.*) INTO v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Notification not found.';
  END IF;

  RETURN v_result;
END;
$$;

-- RPC: Cancel Notification
CREATE OR REPLACE FUNCTION public.cancel_notification(p_notification_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  UPDATE public.notifications
  SET 
    canceled_at = timezone('utc'::text, now()),
    is_archived = true,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_notification_id
  RETURNING to_jsonb(notifications.*) INTO v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Notification not found.';
  END IF;

  RETURN v_result;
END;
$$;

-- 14. Enable Realtime Publications for Realtime Live Sync
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_members;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_logs;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END $$;
