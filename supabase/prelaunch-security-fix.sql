-- Pré-launch security hardening — apply BEFORE store submission.
--
-- Why this exists:
--   1. The original `reading_groups` RLS policy `USING (true)` exposed every
--      group (including invite_code) to any authenticated user. Anyone could
--      enumerate the table, harvest invite_codes, and join groups silently.
--   2. The mobile app calls two RPCs (`find_group_by_invite_code`,
--      `promote_to_admin`) that were never committed to source — they may or
--      may not exist in production. This migration creates them idempotently
--      so the join-by-code and admin-promotion features work in prod.
--
-- Run order: AFTER `reading-groups.sql` (which creates the tables and the
-- broken policy this script replaces).
--
-- Run in: Supabase Dashboard → SQL Editor → paste → RUN.
-- Idempotent: safe to re-run.

-- ============================================================
-- 1. Replace the wide-open SELECT policy on reading_groups
-- ============================================================

DROP POLICY IF EXISTS "Anyone can find by invite code" ON reading_groups;
-- Drop the new policy too in case a previous run already created it —
-- Postgres doesn't have CREATE POLICY ... IF NOT EXISTS, so we drop +
-- recreate to keep the migration idempotent.
DROP POLICY IF EXISTS "Members can read their groups" ON reading_groups;

-- Members can read their own groups. Non-members can no longer enumerate.
-- For the "find by invite code" flow we use the SECURITY DEFINER RPC below
-- (`find_group_by_invite_code`) which bypasses RLS but only returns a row
-- when the caller already knows the exact invite_code.
CREATE POLICY "Members can read their groups"
  ON reading_groups FOR SELECT
  USING (id IN (SELECT get_my_group_ids()));

-- ============================================================
-- 2. find_group_by_invite_code — looks up a group by exact code match.
--    Bypasses RLS via SECURITY DEFINER so unauthenticated-during-join
--    works, but only ever returns ONE row by exact invite_code.
-- ============================================================

CREATE OR REPLACE FUNCTION find_group_by_invite_code(p_code TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  emoji TEXT,
  created_by UUID,
  invite_code TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, description, emoji, created_by, invite_code, created_at
  FROM reading_groups
  WHERE invite_code = p_code
  LIMIT 1;
$$;

-- Lock the function so only authenticated callers can invoke it. Without
-- this, anonymous users could brute-force codes (the format is short).
REVOKE ALL ON FUNCTION find_group_by_invite_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION find_group_by_invite_code(TEXT) TO authenticated;

-- ============================================================
-- 3. promote_to_admin — only an existing admin can promote a member.
--    Implemented as RPC because the client-side UPDATE on group_members
--    would need a recursive RLS policy that's awkward to write safely.
-- ============================================================

CREATE OR REPLACE FUNCTION promote_to_admin(p_group_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  -- Caller must be authenticated.
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Caller must already be admin of this group.
  SELECT role INTO v_caller_role
  FROM group_members
  WHERE group_id = p_group_id AND user_id = auth.uid();

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'You are not a member of this group';
  END IF;

  IF v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Only admins can promote members';
  END IF;

  -- Target must already be a member of the group. The UPDATE is a no-op
  -- otherwise (no rows match), which we surface as an explicit error so
  -- the UI can show a useful message.
  UPDATE group_members
  SET role = 'admin'
  WHERE group_id = p_group_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user is not a member of this group';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION promote_to_admin(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION promote_to_admin(UUID, UUID) TO authenticated;

-- ============================================================
-- 4. admin_remove_member — kick a member out of a group as admin.
--    The default RLS policy on group_members allows users to delete
--    only their OWN row. Without this RPC, the "Retirer" button in
--    the admin's UI silently failed (DELETE returned 0 rows). The
--    SECURITY DEFINER bypass + caller-is-admin check is the safe
--    way to grant cross-row delete to admins.
-- ============================================================

CREATE OR REPLACE FUNCTION admin_remove_member(p_group_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Caller must be admin of this group.
  IF NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id
      AND user_id = auth.uid()
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only group admins can remove members';
  END IF;

  -- Refuse self-targeting via this RPC. Self-leave goes through the
  -- normal DELETE path (allowed by the existing user-self policy).
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Use leaveGroup to leave a group';
  END IF;

  DELETE FROM group_members
  WHERE group_id = p_group_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user is not a member of this group';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION admin_remove_member(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_remove_member(UUID, UUID) TO authenticated;

-- ============================================================
-- 5. Sanity check — re-run after applying to verify.
-- ============================================================

-- Should return ONE row per function:
SELECT proname, prosecdef AS security_definer
FROM pg_proc
WHERE proname IN ('find_group_by_invite_code', 'promote_to_admin', 'admin_remove_member', 'get_my_group_ids')
ORDER BY proname;

-- Should NOT include "Anyone can find by invite code":
SELECT polname, polcmd
FROM pg_policy
WHERE polrelid = 'reading_groups'::regclass
ORDER BY polname;
