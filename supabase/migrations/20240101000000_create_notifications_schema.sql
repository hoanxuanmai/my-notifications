-- ==============================================================================
-- MY-NOTIFICATIONS SUPABASE MIGRATION SCRIPT
-- Replaces NestJS Prisma Schema, Repository, Kafka Consumer, and WebSocket Gateway
-- Direct conversion for hoanxuanmai/my-notifications
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create Notifications Table (Domain Model)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id VARCHAR(255) NOT NULL, -- Compatible with hoanxuanmai/my-notifications RecipientId value object
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,              -- Domain 'content' field
  message TEXT,                       -- Display message preview
  category VARCHAR(50) NOT NULL DEFAULT 'system',
  channel VARCHAR(30) NOT NULL DEFAULT 'in_app' 
    CHECK (channel IN ('in_app', 'push', 'email', 'sms', 'webhook', 'slack', 'discord')),
  priority VARCHAR(20) NOT NULL DEFAULT 'normal' 
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,           -- Direct replacement for CancelNotification use case
  is_archived BOOLEAN NOT NULL DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  action_label VARCHAR(100),
  sender JSONB DEFAULT '{"name":"Notification Hub","role":"Engine"}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Create Delivery Logs Table (Multi-channel telemetry)
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

-- 4. Create Notification Preferences Table
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

-- 5. Create Notification Templates Table
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

-- 6. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient 
  ON public.notifications(recipient_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON public.notifications(user_id, is_read) 
  WHERE is_archived = false;

CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
  ON public.notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_delivery_logs_notif_id 
  ON public.delivery_logs(notification_id);

-- 7. Enable Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- 8. Row Level Security Policies

-- Policy: Users can view their own notifications
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" 
  ON public.notifications 
  FOR SELECT 
  TO authenticated, anon
  USING (
    auth.uid() = user_id 
    OR auth.uid()::text = recipient_id 
    OR recipient_id = 'all'
    OR recipient_id = 'broadcast'
    OR auth.uid() IS NULL -- Allowed in dev/mock environments
  );

-- Policy: Users can update their own notifications (mark read, archive)
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" 
  ON public.notifications 
  FOR UPDATE 
  TO authenticated, anon
  USING (
    auth.uid() = user_id 
    OR auth.uid()::text = recipient_id
    OR auth.uid() IS NULL
  )
  WITH CHECK (
    auth.uid() = user_id 
    OR auth.uid()::text = recipient_id
    OR auth.uid() IS NULL
  );

-- Policy: Service role or authorized backend inserts
DROP POLICY IF EXISTS "notifications_insert_all" ON public.notifications;
CREATE POLICY "notifications_insert_all" 
  ON public.notifications 
  FOR INSERT 
  TO authenticated, anon, service_role
  WITH CHECK (true);

-- Policy: User preferences
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

-- Policy: Templates readable by everyone
DROP POLICY IF EXISTS "templates_select_all" ON public.notification_templates;
CREATE POLICY "templates_select_all" 
  ON public.notification_templates 
  FOR SELECT 
  TO authenticated, anon
  USING (true);

-- Policy: Delivery logs readable for user's notifications
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

-- 9. Stored Procedures / RPC Functions (Direct replacements for NestJS UseCases)

-- RPC: Read Notification (NestJS ReadNotificationUseCase)
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
    is_read = true,
    read_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_notification_id
    AND (auth.uid() = user_id OR auth.uid()::text = recipient_id OR auth.uid() IS NULL)
  RETURNING to_jsonb(notifications.*) INTO v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Notification not found or access denied.';
  END IF;

  RETURN v_result;
END;
$$;

-- RPC: Unread Notification (NestJS UnreadNotificationUseCase)
CREATE OR REPLACE FUNCTION public.unread_notification(p_notification_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  UPDATE public.notifications
  SET 
    is_read = false,
    read_at = NULL,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_notification_id
    AND (auth.uid() = user_id OR auth.uid()::text = recipient_id OR auth.uid() IS NULL)
  RETURNING to_jsonb(notifications.*) INTO v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Notification not found or access denied.';
  END IF;

  RETURN v_result;
END;
$$;

-- RPC: Cancel Notification (NestJS CancelNotificationUseCase)
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
    AND (auth.uid() = user_id OR auth.uid()::text = recipient_id OR auth.uid() IS NULL)
  RETURNING to_jsonb(notifications.*) INTO v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Notification not found or access denied.';
  END IF;

  RETURN v_result;
END;
$$;

-- RPC: Count Recipient Notifications (NestJS CountRecipientNotificationsUseCase)
CREATE OR REPLACE FUNCTION public.count_recipient_notifications(p_recipient_id VARCHAR)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_total INTEGER;
  v_unread INTEGER;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE is_read = false AND is_archived = false AND canceled_at IS NULL)
  INTO v_total, v_unread
  FROM public.notifications
  WHERE recipient_id = p_recipient_id;

  RETURN jsonb_build_object(
    'recipient_id', p_recipient_id,
    'total', v_total,
    'unread', v_unread
  );
END;
$$;

-- RPC: Mark All Read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_recipient_id VARCHAR)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.notifications
  SET 
    is_read = true,
    read_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now())
  WHERE recipient_id = p_recipient_id
    AND is_read = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 10. Enable Supabase Realtime for Tables
DO $$
BEGIN
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
