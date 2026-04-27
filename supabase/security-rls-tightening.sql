-- =============================================================
-- Security RLS tightening — pre-launch
-- =============================================================
-- Purpose: close the 4 RLS holes flagged by the security audit.
--
-- Run in Supabase SQL Editor in order. This is idempotent: it drops
-- the old permissive policies before recreating them, and uses
-- CREATE OR REPLACE for functions.
--
-- IMPORTANT: After running, sanity-check with:
--   SELECT policyname, qual, with_check
--   FROM pg_policies
--   WHERE tablename IN ('reading_groups','friend_invites',
--                       'google_books_cache','group_books');
-- =============================================================


-- -------------------------------------------------------------
-- 1. reading_groups
-- -------------------------------------------------------------
-- Before: SELECT USING (true) — any authenticated user could list
-- every group on the platform AND read every invite_code.
-- After:  SELECT only allowed to members of the group. The "find by
-- invite code" use-case is moved to a SECURITY DEFINER function so
-- the lookup is intentional (one row at a time) and can't be used
-- to enumerate.
-- -------------------------------------------------------------

DROP POLICY IF EXISTS "Anyone can find by invite code" ON reading_groups;
DROP POLICY IF EXISTS "Members can read their groups" ON reading_groups;

CREATE POLICY "Members can read their groups"
  ON reading_groups FOR SELECT
  USING (id IN (SELECT get_my_group_ids()));

-- Public-by-design lookup: takes an invite code, returns at most one
-- row. Cannot be used to enumerate groups because callers must already
-- know the exact code. SECURITY DEFINER bypasses the SELECT policy
-- above, but only for this single function.
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

-- Only authenticated users can call it (anon spam protection).
REVOKE EXECUTE ON FUNCTION find_group_by_invite_code(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION find_group_by_invite_code(TEXT) TO authenticated;


-- -------------------------------------------------------------
-- 2. group_books — close UPDATE without WITH CHECK + harden INSERT
-- -------------------------------------------------------------
-- Before INSERT: only checked group membership, NOT that
-- shared_by = auth.uid() — sharer could spoof another user's id.
-- Before UPDATE: USING only — sharer could set shared_by to anyone
-- else and orphan the row.
-- -------------------------------------------------------------

DROP POLICY IF EXISTS "Members can share books" ON group_books;
DROP POLICY IF EXISTS "Sharers can update their shares" ON group_books;

CREATE POLICY "Members can share books"
  ON group_books FOR INSERT
  WITH CHECK (
    group_id IN (SELECT get_my_group_ids())
    AND auth.uid() = shared_by
  );

CREATE POLICY "Sharers can update their shares"
  ON group_books FOR UPDATE
  USING (auth.uid() = shared_by)
  WITH CHECK (auth.uid() = shared_by);

-- Sharer can also delete their own share (used by removeShare).
DROP POLICY IF EXISTS "Sharers can delete their shares" ON group_books;
CREATE POLICY "Sharers can delete their shares"
  ON group_books FOR DELETE
  USING (auth.uid() = shared_by);


-- -------------------------------------------------------------
-- 3. friend_invites — close SELECT USING (true)
-- -------------------------------------------------------------
-- Before: any authenticated user could list every invite code on
-- the platform and accept any of them.
-- After:  only the inviter can list their own invites; acceptance
-- continues to go through the existing SECURITY DEFINER function
-- accept_friend_invite() which validates the code internally.
-- -------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'friend_invites') THEN

    EXECUTE 'DROP POLICY IF EXISTS "Anyone can read invites" ON friend_invites';
    EXECUTE 'DROP POLICY IF EXISTS "Inviters can read own invites" ON friend_invites';

    EXECUTE $POL$
      CREATE POLICY "Inviters can read own invites"
        ON friend_invites FOR SELECT
        USING (auth.uid() = from_user_id)
    $POL$;
  END IF;
END $$;


-- -------------------------------------------------------------
-- 4. google_books_cache — block cache poisoning
-- -------------------------------------------------------------
-- Before: INSERT/UPDATE WITH CHECK (true) — any authenticated could
-- overwrite cached covers, prices, descriptions for ALL users.
-- After:  the cache is read-only for authenticated users. Only the
-- service role (server-side / Edge Function) can write to it.
-- -------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'google_books_cache') THEN

    EXECUTE 'DROP POLICY IF EXISTS "Anyone can insert cache" ON google_books_cache';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can update cache" ON google_books_cache';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can read cache" ON google_books_cache';

    EXECUTE $POL$
      CREATE POLICY "Authenticated can read cache"
        ON google_books_cache FOR SELECT
        TO authenticated
        USING (true)
    $POL$;
    -- No INSERT/UPDATE/DELETE policy for authenticated → those are
    -- denied by default. The service_role bypasses RLS so server-side
    -- cache writes still work.
  END IF;
END $$;


-- -------------------------------------------------------------
-- 5. get_all_feedback — restrict to service role
-- -------------------------------------------------------------
-- Before: SECURITY DEFINER function with no GRANT/REVOKE → every
-- authenticated user could read every feedback ever submitted.
-- After:  only the service role can call it (admin tooling only).
-- -------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_all_feedback'
  ) THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION get_all_feedback() FROM PUBLIC, anon, authenticated';
    -- service_role keeps EXECUTE by default.
  END IF;
END $$;


-- -------------------------------------------------------------
-- 6. Final sanity dump (print to stdout for the operator)
-- -------------------------------------------------------------
-- Uncomment to verify:
-- SELECT tablename, policyname, cmd, qual, with_check
--   FROM pg_policies
--  WHERE tablename IN ('reading_groups','friend_invites',
--                      'google_books_cache','group_books')
--  ORDER BY tablename, policyname;
