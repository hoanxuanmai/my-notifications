-- ==============================================================================
-- FIX: push_subscriptions RLS only granted access to `authenticated` +
-- `service_role`, unlike every other table in this schema (channels,
-- channel_members, notifications — see 20260301010000_fix_relationships_
-- and_rls_policies.sql) which also allows `anon` with an
-- `auth.uid() IS NULL OR ...` escape hatch for this app's "instant demo
-- access, no login required" mode.
--
-- Without this, pushApi.subscribe()'s upsert from an unauthenticated
-- browser session gets silently rejected by RLS (42501) and the Web Push
-- subscription is never stored, so push notifications can never be sent
-- to that browser regardless of VAPID configuration.
-- ==============================================================================

DROP POLICY IF EXISTS "Users can manage their own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Service role full access to push subscriptions" ON public.push_subscriptions;

CREATE POLICY "push_subscriptions_select"
  ON public.push_subscriptions FOR SELECT
  TO authenticated, anon
  USING (auth.uid() IS NULL OR user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "push_subscriptions_insert"
  ON public.push_subscriptions FOR INSERT
  TO authenticated, anon, service_role
  WITH CHECK (auth.uid() IS NULL OR user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "push_subscriptions_update"
  ON public.push_subscriptions FOR UPDATE
  TO authenticated, anon, service_role
  USING (auth.uid() IS NULL OR user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (auth.uid() IS NULL OR user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "push_subscriptions_delete"
  ON public.push_subscriptions FOR DELETE
  TO authenticated, anon, service_role
  USING (auth.uid() IS NULL OR user_id = auth.uid() OR user_id IS NULL);

GRANT ALL ON TABLE public.push_subscriptions TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
