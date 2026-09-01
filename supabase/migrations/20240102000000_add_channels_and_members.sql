-- ==============================================================================
-- SUPABASE MIGRATION: Channels & Channel Members Schema Update
-- Ensures full parity for Channels, Members, Policies and RPCs
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create Channels Table if not exists
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

-- 3. Create Channel Members Table if not exists
CREATE TABLE IF NOT EXISTS public.channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uniq_channel_member UNIQUE(user_id, channel_id)
);

-- 4. Create User Delivery Channels Table if not exists
CREATE TABLE IF NOT EXISTS public.user_delivery_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Add columns to Notifications table if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='channel_id') THEN
    ALTER TABLE public.notifications ADD COLUMN channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='user_id') THEN
    ALTER TABLE public.notifications ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='read') THEN
    ALTER TABLE public.notifications ADD COLUMN read BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='is_read') THEN
    ALTER TABLE public.notifications ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='type') THEN
    ALTER TABLE public.notifications ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT 'info';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='payload') THEN
    ALTER TABLE public.notifications ADD COLUMN payload JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='metadata') THEN
    ALTER TABLE public.notifications ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='canceled_at') THEN
    ALTER TABLE public.notifications ADD COLUMN canceled_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='expires_at') THEN
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

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_channels_user_id ON public.channels(user_id);
CREATE INDEX IF NOT EXISTS idx_channels_webhook_token ON public.channels(webhook_token);
CREATE INDEX IF NOT EXISTS idx_channels_is_active ON public.channels(is_active);
CREATE INDEX IF NOT EXISTS idx_channel_members_user ON public.channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_channel ON public.channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_notifications_channel_id ON public.notifications(channel_id);
CREATE INDEX IF NOT EXISTS idx_notifications_channel_created ON public.notifications(channel_id, created_at DESC);

-- 8. Enable RLS
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_delivery_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_logs ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies
DROP POLICY IF EXISTS "channels_select" ON public.channels;
-- Security Definer Helper Functions (Bypasses RLS to avoid infinite recursion)
CREATE OR REPLACE FUNCTION public.is_channel_member(p_channel_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.channel_members
    WHERE channel_id = p_channel_id AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_channel_owner(p_channel_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.channels
    WHERE id = p_channel_id AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_channel_ids(p_user_id UUID DEFAULT auth.uid())
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id FROM public.channels WHERE user_id = p_user_id
  UNION
  SELECT channel_id FROM public.channel_members WHERE user_id = p_user_id;
$$;

CREATE POLICY "channels_select" 
  ON public.channels 
  FOR SELECT 
  TO authenticated, anon
  USING (
    auth.uid() IS NULL
    OR user_id = auth.uid() 
    OR public.is_channel_member(id, auth.uid())
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

-- Channel Members Policies
DROP POLICY IF EXISTS "channel_members_select" ON public.channel_members;
CREATE POLICY "channel_members_select" 
  ON public.channel_members 
  FOR SELECT 
  TO authenticated, anon
  USING (
    auth.uid() IS NULL
    OR user_id = auth.uid()
    OR public.is_channel_owner(channel_id, auth.uid())
    OR public.is_channel_member(channel_id, auth.uid())
  );

DROP POLICY IF EXISTS "channel_members_insert" ON public.channel_members;
CREATE POLICY "channel_members_insert" 
  ON public.channel_members 
  FOR INSERT 
  TO authenticated, anon, service_role
  WITH CHECK (
    public.is_channel_owner(channel_id, auth.uid())
    OR auth.uid() IS NULL
  );

DROP POLICY IF EXISTS "channel_members_delete" ON public.channel_members;
CREATE POLICY "channel_members_delete" 
  ON public.channel_members 
  FOR DELETE 
  TO authenticated, anon, service_role
  USING (
    public.is_channel_owner(channel_id, auth.uid())
    OR user_id = auth.uid()
    OR auth.uid() IS NULL
  );

-- Notifications RLS
DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
CREATE POLICY "notifications_select_policy" 
  ON public.notifications 
  FOR SELECT 
  TO authenticated, anon
  USING (
    auth.uid() IS NULL
    OR user_id = auth.uid() 
    OR auth.uid()::text = recipient_id 
    OR recipient_id IN ('all', 'broadcast')
    OR (channel_id IS NOT NULL AND channel_id IN (SELECT public.get_user_channel_ids(auth.uid())))
  );

DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;
CREATE POLICY "notifications_update_policy" 
  ON public.notifications 
  FOR UPDATE 
  TO authenticated, anon, service_role
  USING (
    auth.uid() IS NULL
    OR user_id = auth.uid() 
    OR auth.uid()::text = recipient_id 
    OR (channel_id IS NOT NULL AND channel_id IN (SELECT public.get_user_channel_ids(auth.uid())))
  )
  WITH CHECK (
    auth.uid() IS NULL
    OR user_id = auth.uid() 
    OR auth.uid()::text = recipient_id 
    OR (channel_id IS NOT NULL AND channel_id IN (SELECT public.get_user_channel_ids(auth.uid())))
  );

-- 10. RPC Functions

-- RPC: Create Channel
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

-- RPC: Add Channel Member by Email
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

-- RPC: Remove Channel Member
CREATE OR REPLACE FUNCTION public.remove_channel_member(
  p_channel_id UUID,
  p_member_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID := auth.uid();
  v_channel public.channels%ROWTYPE;
BEGIN
  SELECT * INTO v_channel FROM public.channels WHERE id = p_channel_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Channel not found.';
  END IF;

  IF v_current_user_id IS NOT NULL AND v_channel.user_id != v_current_user_id AND v_current_user_id != p_member_user_id THEN
    RAISE EXCEPTION 'You do not have permission to remove members from this channel.';
  END IF;

  DELETE FROM public.channel_members
  WHERE channel_id = p_channel_id AND user_id = p_member_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC: Get User Channels
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

-- RPC: Send Channel Notification
CREATE OR REPLACE FUNCTION public.send_channel_notification(
  p_channel_id UUID,
  p_title VARCHAR(500),
  p_message TEXT,
  p_type VARCHAR(50) DEFAULT 'info',
  p_priority VARCHAR(50) DEFAULT 'normal',
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
  SELECT * INTO v_channel 
  FROM public.channels 
  WHERE id = p_channel_id AND is_active = true AND expires_at > timezone('utc'::text, now());
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Channel with ID % not found or expired.', p_channel_id;
  END IF;

  v_expires_at := timezone('utc'::text, now()) + (COALESCE(p_ttl_days, 3) || ' days')::interval;

  INSERT INTO public.notifications (
    channel_id,
    user_id,
    title,
    message,
    content,
    type,
    priority,
    category,
    channel,
    read,
    is_read,
    metadata,
    payload,
    expires_at
  )
  VALUES (
    p_channel_id,
    v_channel.user_id,
    p_title,
    p_message,
    p_message,
    COALESCE(p_type, 'info'),
    COALESCE(p_priority, 'normal'),
    COALESCE(p_metadata->>'category', 'system'),
    'in_app',
    false,
    false,
    COALESCE(p_metadata, '{}'::jsonb),
    COALESCE(p_metadata, '{}'::jsonb),
    v_expires_at
  )
  RETURNING * INTO v_notification;

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
    10,
    'supabase_rpc_channel',
    jsonb_build_object('channelId', p_channel_id, 'channelName', v_channel.name)
  );

  RETURN to_jsonb(v_notification);
END;
$$;

-- RPC: Send Notification by Webhook
CREATE OR REPLACE FUNCTION public.send_notification_by_webhook(
  p_webhook_token VARCHAR(255),
  p_title VARCHAR(500),
  p_message TEXT,
  p_type VARCHAR(50) DEFAULT 'info',
  p_priority VARCHAR(50) DEFAULT 'normal',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_channel public.channels%ROWTYPE;
BEGIN
  SELECT * INTO v_channel 
  FROM public.channels 
  WHERE webhook_token = p_webhook_token AND is_active = true AND expires_at > timezone('utc'::text, now());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired webhook token.';
  END IF;

  RETURN public.send_channel_notification(
    p_channel_id => v_channel.id,
    p_title => p_title,
    p_message => p_message,
    p_type => p_type,
    p_priority => p_priority,
    p_metadata => p_metadata
  );
END;
$$;

-- RPC: Mark Channel Notifications Read
CREATE OR REPLACE FUNCTION public.mark_channel_notifications_read(
  p_channel_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_updated_count INTEGER;
BEGIN
  IF p_channel_id IS NOT NULL THEN
    UPDATE public.notifications
    SET 
      read = true,
      is_read = true,
      read_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
    WHERE 
      channel_id = p_channel_id
      AND read = false;
      
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  ELSE
    UPDATE public.notifications n
    SET 
      read = true,
      is_read = true,
      read_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
    WHERE 
      n.read = false
      AND (
        (v_user_id IS NOT NULL AND n.user_id = v_user_id)
        OR (v_user_id IS NOT NULL AND n.channel_id IN (
            SELECT id FROM public.channels WHERE user_id = v_user_id
            UNION
            SELECT channel_id FROM public.channel_members WHERE user_id = v_user_id
        ))
        OR (v_user_id IS NULL)
      );
      
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object('success', true, 'count', v_updated_count);
END;
$$;

-- RPC: Get Channel Unread Count
CREATE OR REPLACE FUNCTION public.get_channel_unread_count(p_channel_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.notifications
  WHERE channel_id = p_channel_id
    AND read = false
    AND expires_at > timezone('utc'::text, now());
    
  RETURN COALESCE(v_count, 0);
END;
$$;

-- RPC: Get Channels Unread Summary
CREATE OR REPLACE FUNCTION public.get_channels_unread_summary(p_user_id UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_object_agg(
      c.id::text, 
      (
        SELECT COUNT(*) 
        FROM public.notifications n 
        WHERE n.channel_id = c.id 
          AND n.read = false 
          AND n.expires_at > timezone('utc'::text, now())
      )
    ), 
    '{}'::jsonb
  ) INTO v_result
  FROM public.channels c
  WHERE c.is_active = true
    AND c.expires_at > timezone('utc'::text, now())
    AND (
      p_user_id IS NULL
      OR c.user_id = p_user_id 
      OR c.id IN (SELECT channel_id FROM public.channel_members WHERE user_id = p_user_id)
    );

  RETURN v_result;
END;
$$;

-- 11. Enable Realtime Publications for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_members;
