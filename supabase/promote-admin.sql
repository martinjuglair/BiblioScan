-- =============================================================
-- Promote a member to admin — pre-launch RPC
-- =============================================================
-- Closes the gap flagged by the audit: app/group/[id].tsx tells the
-- last-admin user "transfer ownership first" but the UI had no way to
-- actually promote anyone. Without this migration the admin is trapped.
--
-- Uses SECURITY DEFINER so the function bypasses RLS, and we manually
-- check inside that:
--   1. The caller is authenticated.
--   2. The caller is currently admin of the same group.
--   3. The target user is already a member of the group.
--
-- This avoids re-opening UPDATE on group_members (which would otherwise
-- need a recursive policy that's a pain to write without infinite loops
-- — see also get_my_group_ids() for the same reason).
-- =============================================================

CREATE OR REPLACE FUNCTION promote_to_admin(p_group_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_target_exists BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- 1. Caller must be admin of the group.
  SELECT role INTO v_caller_role
  FROM group_members
  WHERE group_id = p_group_id
    AND user_id = auth.uid();

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Not a member of this group' USING ERRCODE = '42501';
  END IF;

  IF v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Only admins can promote members' USING ERRCODE = '42501';
  END IF;

  -- 2. Target must already be a member (don't create a row out of thin air).
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id
      AND user_id = p_user_id
  ) INTO v_target_exists;

  IF NOT v_target_exists THEN
    RAISE EXCEPTION 'Target user is not a member of this group' USING ERRCODE = '23503';
  END IF;

  -- 3. Promote (idempotent — promoting an existing admin is a no-op).
  UPDATE group_members
  SET role = 'admin'
  WHERE group_id = p_group_id
    AND user_id = p_user_id;
END;
$$;

-- Lock down execution to authenticated users only.
REVOKE EXECUTE ON FUNCTION promote_to_admin(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION promote_to_admin(UUID, UUID) TO authenticated;
