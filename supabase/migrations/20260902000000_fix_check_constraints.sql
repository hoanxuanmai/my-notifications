-- ==============================================================================
-- SUPABASE MIGRATION: 20260902000000_fix_check_constraints.sql
-- Drop all CHECK constraints on notifications and related tables to allow
-- 100% free, unconstrained input for priority, type, channel, category, status, etc.
-- ==============================================================================

-- 1. Drop all check constraints on notifications table
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_priority_check;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_channel_check;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_category_check;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_status_check;

-- 2. Drop any check constraints on delivery_logs and other tables if present
ALTER TABLE public.delivery_logs DROP CONSTRAINT IF EXISTS delivery_logs_status_check;
ALTER TABLE public.delivery_logs DROP CONSTRAINT IF EXISTS delivery_logs_channel_check;
ALTER TABLE public.user_delivery_channels DROP CONSTRAINT IF EXISTS user_delivery_channels_digest_frequency_check;

-- 3. Dynamically drop any remaining check constraints on public.notifications
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'public.notifications'::regclass 
      AND contype = 'c'
  ) LOOP
    EXECUTE 'ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
  END LOOP;
END $$;

-- 4. High-performance indexes for Webhook token and Channel lookup
CREATE INDEX IF NOT EXISTS idx_channels_webhook_token_btree 
  ON public.channels(webhook_token);

CREATE INDEX IF NOT EXISTS idx_channels_active_webhook_token 
  ON public.channels(webhook_token) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_channels_id_active 
  ON public.channels(id) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_channel 
  ON public.notifications(recipient_id, channel_id);

CREATE INDEX IF NOT EXISTS idx_notifications_priority_created 
  ON public.notifications(priority, created_at DESC);

-- 5. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
