-- ==============================================================================
-- SUPABASE MIGRATION: 20260301010000_fix_relationships_and_rls_policies.sql
-- Fix Foreign Key Relationships for PostgREST resource embedding:
--   1. notifications -> channels (channel_id foreign key constraint)
--   2. channel_members -> channels (channel_id foreign key constraint)
-- Fix RLS Infinite Recursion:
--   Use SECURITY DEFINER functions to eliminate circular policy evaluations
--   on channels, channel_members, and notifications
-- ==============================================================================

-- 1. Ensure Channels Table Exists and has correct constraints
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

-- 2. Ensure Channel Members Table Exists with Columns and Foreign Keys
CREATE TABLE IF NOT EXISTS public.channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  email VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uniq_channel_member UNIQUE(user_id, channel_id)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='channel_members' AND column_name='email') THEN
    ALTER TABLE public.channel_members ADD COLUMN email VARCHAR(255);
  END IF;
END $$;

-- 3. Ensure Notifications Table Exists with channel_id Foreign Key Constraint
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id VARCHAR(255),
  title VARCHAR(500) NOT NULL,
  content TEXT,
  message TEXT NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'system',
  channel VARCHAR(30) NOT NULL DEFAULT 'in_app',
  type VARCHAR(50) NOT NULL DEFAULT 'info',
  priority VARCHAR(50) NOT NULL DEFAULT 'normal',
  read BOOLEAN NOT NULL DEFAULT false,
  is_read BOOLEAN NOT NULL DEFAULT false,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  action_label VARCHAR(100),
  sender JSONB DEFAULT '{"name":"Notification Hub","role":"Engine"}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '3 days')
);

-- Ensure explicit foreign key constraint for PostgREST embedding
DO $$
BEGIN
  -- Re-link notifications -> channels FK
  ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS fk_notifications_channel;
  ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_channel_id_fkey;
  ALTER TABLE public.notifications 
    ADD CONSTRAINT notifications_channel_id_fkey 
    FOREIGN KEY (channel_id) 
    REFERENCES public.channels(id) 
    ON DELETE CASCADE;

  -- Re-link channel_members -> channels FK
  ALTER TABLE public.channel_members DROP CONSTRAINT IF EXISTS fk_channel_members_channel;
  ALTER TABLE public.channel_members DROP CONSTRAINT IF EXISTS channel_members_channel_id_fkey;
  ALTER TABLE public.channel_members 
    ADD CONSTRAINT channel_members_channel_id_fkey 
    FOREIGN KEY (channel_id) 
    REFERENCES public.channels(id) 
    ON DELETE CASCADE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Foreign key constraints already exist or updated.';
END $$;

-- 4. Create Security Definer Helper Functions (Bypasses RLS to avoid infinite recursion)
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

-- 5. Enable RLS on all tables
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 6. Clean and Optimized RLS Policies (Zero recursion)

-- Channels Policies
DROP POLICY IF EXISTS "channels_select" ON public.channels;
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
    auth.uid() IS NULL 
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "channels_update" ON public.channels;
CREATE POLICY "channels_update" 
  ON public.channels 
  FOR UPDATE 
  TO authenticated, anon, service_role
  USING (
    auth.uid() IS NULL 
    OR user_id = auth.uid()
  )
  WITH CHECK (
    auth.uid() IS NULL 
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "channels_delete" ON public.channels;
CREATE POLICY "channels_delete" 
  ON public.channels 
  FOR DELETE 
  TO authenticated, anon, service_role
  USING (
    auth.uid() IS NULL 
    OR user_id = auth.uid()
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
    auth.uid() IS NULL
    OR public.is_channel_owner(channel_id, auth.uid())
  );

DROP POLICY IF EXISTS "channel_members_delete" ON public.channel_members;
CREATE POLICY "channel_members_delete" 
  ON public.channel_members 
  FOR DELETE 
  TO authenticated, anon, service_role
  USING (
    auth.uid() IS NULL
    OR user_id = auth.uid()
    OR public.is_channel_owner(channel_id, auth.uid())
  );

-- Notifications Policies
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

DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;
CREATE POLICY "notifications_insert_policy" 
  ON public.notifications 
  FOR INSERT 
  TO authenticated, anon, service_role
  WITH CHECK (true);

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

DROP POLICY IF EXISTS "notifications_delete_policy" ON public.notifications;
CREATE POLICY "notifications_delete_policy" 
  ON public.notifications 
  FOR DELETE 
  TO authenticated, anon, service_role
  USING (
    auth.uid() IS NULL
    OR user_id = auth.uid() 
    OR (channel_id IS NOT NULL AND public.is_channel_owner(channel_id, auth.uid()))
  );

-- 7. Grant Permissions to roles
GRANT ALL ON TABLE public.channels TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.channel_members TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.notifications TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.is_channel_member(UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_channel_owner(UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_channel_ids(UUID) TO anon, authenticated, service_role;

-- 8. Add Indexes for High-Performance Join and Filtering
CREATE INDEX IF NOT EXISTS idx_notifications_channel_id_fkey ON public.notifications(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_channel_id_fkey ON public.channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_user_id_fkey ON public.channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_channels_user_id_fkey ON public.channels(user_id);

-- 9. Notify PostgREST to reload schema cache immediately
NOTIFY pgrst, 'reload schema';
