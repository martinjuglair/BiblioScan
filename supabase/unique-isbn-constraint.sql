-- =====================================================================
-- Ensure comic_books has a UNIQUE constraint on (user_id, isbn)
-- =====================================================================
--
-- Why: the app's add-book flow uses upsert with onConflict: "user_id,isbn".
-- Postgres / Supabase only honours that ON CONFLICT target when it
-- matches a unique constraint or unique index — otherwise a fast
-- double-tap on "Ajouter" could (in theory) create two rows.
--
-- This table doesn't have a separate `id` column; the natural composite
-- key is (user_id, isbn). Most likely the PRIMARY KEY is already on those
-- two columns, in which case Postgres already enforces uniqueness and
-- this migration is a no-op. If it isn't, this script promotes the
-- existing non-unique idx_comic_books_user_isbn to a UNIQUE INDEX so
-- the upsert behaves correctly.
--
-- Idempotent: safe to re-run.
-- =====================================================================

-- Inspect — what kind of constraint do we already have on (user_id, isbn)?
DO $$
DECLARE
  has_unique boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'comic_books'
      AND indexdef ILIKE '%UNIQUE%'
      AND indexdef ILIKE '%(user_id, isbn)%'
  ) INTO has_unique;

  IF has_unique THEN
    RAISE NOTICE 'comic_books already has a UNIQUE index on (user_id, isbn) — nothing to do.';
  ELSE
    -- Drop the non-unique idx if present so the new unique one can take its
    -- place under the same name.
    DROP INDEX IF EXISTS public.idx_comic_books_user_isbn;
    -- This will fail loudly if duplicates somehow exist — the error message
    -- tells you which (user_id, isbn) pair is duplicated so you can clean
    -- it up by hand from the Table Editor.
    EXECUTE 'CREATE UNIQUE INDEX idx_comic_books_user_isbn ON public.comic_books (user_id, isbn)';
    RAISE NOTICE 'Created UNIQUE INDEX on comic_books (user_id, isbn).';
  END IF;
END $$;
