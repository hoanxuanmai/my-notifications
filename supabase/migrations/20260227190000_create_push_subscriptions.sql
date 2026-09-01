-- ==============================================================================
-- MIGRATION: 20260227190000_create_push_subscriptions.sql
-- DESCRIPTION: Web Push Protocol RFC 8291 / RFC 8292 Subscription Registry
-- ==============================================================================

-- 1. Create push_subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh VARCHAR(255) NOT NULL,
  auth_token VARCHAR(255) NOT NULL,
  device_name VARCHAR(100) DEFAULT 'Web Browser',
  browser_name VARCHAR(50),
  os_name VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user 
  ON public.push_subscriptions (user_id) 
  WHERE is_active = true;

-- 3. Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Users can manage their own push subscriptions"
  ON public.push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role full access to push subscriptions"
  ON public.push_subscriptions FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. Realtime Replication for push subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.push_subscriptions;
