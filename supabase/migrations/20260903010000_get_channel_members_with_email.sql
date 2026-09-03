-- Migration: Ensure channel members display by email and backfill email from auth.users

-- 1. Ensure email column exists on channel_members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'channel_members' 
      AND column_name = 'email'
  ) THEN
    ALTER TABLE public.channel_members ADD COLUMN email VARCHAR(255);
  END IF;
END $$;

-- 2. Backfill existing channel_members email from auth.users
UPDATE public.channel_members cm
SET email = u.email
FROM auth.users u
WHERE cm.user_id = u.id 
  AND (cm.email IS NULL OR cm.email = '');

-- 3. Update add_channel_member_by_email to explicitly persist the email
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

  -- Insert member with email
  INSERT INTO public.channel_members (channel_id, user_id, role, email)
  VALUES (p_channel_id, v_target_user_id, 'member', p_email)
  ON CONFLICT (user_id, channel_id) DO UPDATE 
    SET email = p_email, updated_at = timezone('utc'::text, now())
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

-- 4. Create RPC get_channel_members to return members with email
CREATE OR REPLACE FUNCTION public.get_channel_members(p_channel_id UUID)
RETURNS TABLE (
  id UUID,
  channel_id UUID,
  user_id UUID,
  role VARCHAR(50),
  email VARCHAR(255),
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.id,
    cm.channel_id,
    cm.user_id,
    cm.role,
    COALESCE(cm.email, u.email::varchar) AS email,
    cm.created_at
  FROM public.channel_members cm
  LEFT JOIN auth.users u ON u.id = cm.user_id
  WHERE cm.channel_id = p_channel_id
  ORDER BY cm.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_channel_members(UUID) TO authenticated, service_role, anon;
