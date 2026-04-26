-- =====================================================================
-- Volume readiness migration — pre-store-launch
-- =====================================================================
--
-- 1. Add missing composite indexes on group_* tables. Without them, lookups
--    like "all books shared in group X" or "all reviews on book Y in group X"
--    fall back to seq scans, which is fine at 5-10 books/group but hurts
--    around 50+. With ~500 active groups × 30 books each = 15k rows where
--    these indexes start mattering.
--
-- 2. Schedule a daily cleanup of google_books_cache rows older than 90 days.
--    Without this, the cache table grows unbounded (~365k rows/year at full
--    quota usage, ~730 MB) and would blow the Free tier 500 MB DB limit
--    within 12-18 months. 90 days is generous: book metadata is immutable
--    so the only "loss" from a cleanup is having to refetch a single ISBN
--    on next miss — which the in-app stale-while-revalidate already
--    handles gracefully.
--
-- Idempotent: safe to re-run.
-- =====================================================================

-- ───────────────────────────────────────────────────────────────────
-- 1. Group-related indexes
-- ───────────────────────────────────────────────────────────────────

-- group_books: lookup by group + dedup (group_id, isbn)
CREATE INDEX IF NOT EXISTS idx_group_books_group
  ON public.group_books (group_id);
CREATE INDEX IF NOT EXISTS idx_group_books_group_isbn
  ON public.group_books (group_id, isbn);

-- group_reviews: lookup all reviews on a given book in a group, and
-- "what did this user review in this group"
CREATE INDEX IF NOT EXISTS idx_group_reviews_group_book
  ON public.group_reviews (group_id, isbn);
CREATE INDEX IF NOT EXISTS idx_group_reviews_user
  ON public.group_reviews (user_id);

-- group_activity: feed query is "give me last N for group X ordered by created_at"
CREATE INDEX IF NOT EXISTS idx_group_activity_group_time
  ON public.group_activity (group_id, created_at DESC);

-- group_members: "is this user in this group?" + "who's in group X?"
CREATE INDEX IF NOT EXISTS idx_group_members_group
  ON public.group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user
  ON public.group_members (user_id);

-- ───────────────────────────────────────────────────────────────────
-- 2. Daily cache cleanup via pg_cron
-- ───────────────────────────────────────────────────────────────────
-- Supabase ships with pg_cron enabled in the `cron` schema on Pro plans
-- and on Free plans for projects created after Q1 2024. If pg_cron isn't
-- available, fall back to a manual cleanup function that can be run by
-- a Vercel cron / GitHub Action / Edge Function instead.

CREATE OR REPLACE FUNCTION public.cleanup_google_books_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.google_books_cache
  WHERE fetched_at < now() - interval '90 days';
END;
$$;

-- Try to schedule via pg_cron. The DO block silently no-ops if pg_cron
-- isn't installed — in that case run cleanup_google_books_cache() from
-- a Vercel cron daily.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Drop any prior schedule before re-creating (idempotent re-runs).
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'cleanup-google-books-cache';

    PERFORM cron.schedule(
      'cleanup-google-books-cache',
      '17 3 * * *',                          -- 03:17 UTC every day
      $cron$SELECT public.cleanup_google_books_cache();$cron$
    );
  END IF;
END;
$$;

-- ───────────────────────────────────────────────────────────────────
-- 3. Quick sanity index — comic_books wishlist filter
-- ───────────────────────────────────────────────────────────────────
-- The wishlist drawer query is `WHERE user_id = $1 AND wishlist = true`.
-- Already covered by the user_id index but a partial index makes it free.
CREATE INDEX IF NOT EXISTS idx_comic_books_user_wishlist
  ON public.comic_books (user_id)
  WHERE wishlist = true;
