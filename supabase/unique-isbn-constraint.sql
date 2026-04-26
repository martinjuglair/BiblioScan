-- =====================================================================
-- Add UNIQUE constraint on comic_books (user_id, isbn)
-- =====================================================================
--
-- Why: the app does scanComicBook.confirm → findByISBN → save (upsert).
-- The upsert uses onConflict: "user_id,isbn", which Supabase / Postgres
-- only honours when a UNIQUE constraint or UNIQUE INDEX exists on those
-- columns. The existing idx_comic_books_user_isbn was non-unique → in
-- the rare race where the user double-tapped "Ajouter" before the first
-- save returned, two concurrent inserts could each pass the duplicate
-- check and both succeed, creating two rows with the same ISBN.
--
-- This migration:
--   1. Deduplicates existing rows (keeps the oldest by created_at) so the
--      unique constraint can be added without rejecting prod data.
--   2. Replaces the non-unique index with a UNIQUE INDEX (Postgres treats
--      a UNIQUE INDEX as a constraint for purposes of ON CONFLICT).
--
-- Idempotent: safe to re-run.
-- =====================================================================

-- ── 1. Dedupe existing rows (keep the oldest per (user_id, isbn)) ──
WITH duplicates AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, isbn
      ORDER BY added_at ASC, id ASC
    ) AS rn
  FROM public.comic_books
)
DELETE FROM public.comic_books
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- ── 2. Drop the old non-unique index, add a UNIQUE one ──
DROP INDEX IF EXISTS public.idx_comic_books_user_isbn;

CREATE UNIQUE INDEX IF NOT EXISTS idx_comic_books_user_isbn
  ON public.comic_books (user_id, isbn);
