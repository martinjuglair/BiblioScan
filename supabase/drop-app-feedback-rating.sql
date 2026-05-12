-- ============================================================
-- Drop the star-rating requirement from app_feedback
-- ------------------------------------------------------------
-- The Profile → "Ton avis compte" form no longer collects a star
-- rating: the dimension didn't add signal beyond the free-text
-- message and gated submission on an extra interaction step.
--
-- Two changes here, both backward compatible:
--   1. Make `rating` nullable so the new client (which never sends
--      it) can insert without a workaround.
--   2. Drop the 1..5 CHECK constraint that would otherwise reject
--      our temporary hardcoded `rating=3` from the transitional
--      build.
--
-- Existing rows keep their historical ratings — we don't lose
-- pre-launch user feedback. The dashboard's `recent_feedback`
-- block simply shows zero stars for rows where rating is NULL
-- (handled client-side).
-- ============================================================

ALTER TABLE public.app_feedback
  ALTER COLUMN rating DROP NOT NULL;

-- The CHECK constraint name is auto-generated; we look it up and
-- drop it dynamically so this script is idempotent across envs.
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.app_feedback'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%rating%>=%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.app_feedback DROP CONSTRAINT %I', cname);
  END IF;
END $$;
