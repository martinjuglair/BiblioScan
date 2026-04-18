-- ═══════════════════════════════════════════════════════════════════════════
-- Ploom — Security hardening patch (to run in Supabase SQL Editor)
-- Date: 2026-04-17
--
-- Addresses 3 findings from the security audit:
--   1. storage.objects policies on `book-covers` are too permissive
--      → any authenticated user can overwrite/delete another user's cover.
--   2. group_books has no DELETE policy — ambiguous for members.
--   3. Belt-and-suspenders verification that RLS is on the main tables.
--
-- SAFE TO RUN MULTIPLE TIMES (idempotent via DROP POLICY IF EXISTS).
-- ═══════════════════════════════════════════════════════════════════════════


-- ──────────────────────────────────────────────────────────────────────────
-- 1. STORAGE — book-covers bucket
--
-- Convention: each file is stored under `{user_id}/{...}.ext`. The policy
-- reads the first path segment and compares it to the caller's auth.uid.
--
-- If your upload code uses a different naming scheme, adapt the filter.
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Authenticated users can update covers" ON storage.objects;
DROP POLICY IF EXISTS "Users update own covers" ON storage.objects;

CREATE POLICY "Users update own covers" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'book-covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'book-covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Authenticated users can delete covers" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own covers" ON storage.objects;

CREATE POLICY "Users delete own covers" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'book-covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Upload (INSERT) should also enforce ownership.
DROP POLICY IF EXISTS "Authenticated users can upload covers" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own covers" ON storage.objects;

CREATE POLICY "Users upload own covers" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'book-covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Public read stays (covers are meant to be viewable once uploaded).
DROP POLICY IF EXISTS "Public read access to covers" ON storage.objects;

CREATE POLICY "Public read access to covers" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'book-covers');


-- ──────────────────────────────────────────────────────────────────────────
-- 2. GROUP BOOKS — explicit DELETE policy
--
-- Only the user who shared a book in the group can remove it.
-- (Prevents random group members from clearing someone else's share.)
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "sharer_deletes_own_share" ON group_books;

CREATE POLICY "sharer_deletes_own_share" ON group_books
  FOR DELETE TO authenticated
  USING (auth.uid() = shared_by);


-- ──────────────────────────────────────────────────────────────────────────
-- 3. BELT-AND-SUSPENDERS — confirm RLS on main tables
--
-- These tables were created manually via the Supabase UI; their RLS has
-- already been confirmed ON, but we assert it again to guarantee state.
-- ──────────────────────────────────────────────────────────────────────────

ALTER TABLE comic_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories   ENABLE ROW LEVEL SECURITY;

-- If the existing policies use USING (true) instead of auth.uid() = user_id,
-- uncomment and run the block below to tighten them.
--
-- DROP POLICY IF EXISTS "Users manage own books" ON comic_books;
-- CREATE POLICY "Users manage own books" ON comic_books
--   FOR ALL TO authenticated
--   USING (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);
--
-- DROP POLICY IF EXISTS "Users manage own categories" ON categories;
-- CREATE POLICY "Users manage own categories" ON categories
--   FOR ALL TO authenticated
--   USING (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);


-- ──────────────────────────────────────────────────────────────────────────
-- VERIFICATION QUERIES — run these AFTER the block above to confirm state.
-- ──────────────────────────────────────────────────────────────────────────

-- Should return 2 (both tables RLS on).
-- SELECT count(*) FROM pg_tables
-- WHERE tablename IN ('comic_books', 'categories') AND rowsecurity = true;

-- List all storage policies on book-covers — should show 4 (SELECT public,
-- INSERT/UPDATE/DELETE gated by foldername).
-- SELECT policyname, cmd FROM pg_policies
-- WHERE schemaname = 'storage' AND tablename = 'objects';

-- Confirm group_books has a DELETE policy.
-- SELECT policyname FROM pg_policies
-- WHERE tablename = 'group_books' AND cmd = 'DELETE';
