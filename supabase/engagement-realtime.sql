-- ============================================================
-- Enable Realtime on engagement_recipients
-- ------------------------------------------------------------
-- The mobile EngagementBanner subscribes to INSERTs filtered by
-- `user_id = auth.uid()` so a new test/campaign push from the
-- dashboard surfaces instantly without the user having to
-- background+foreground the app to trigger a re-fetch.
--
-- Run once on Supabase SQL Editor. Idempotent — safe to re-run.
-- ============================================================

-- Add the table to Supabase's default `supabase_realtime`
-- publication. `IF NOT EXISTS` would be nicer but Postgres doesn't
-- expose it for ALTER PUBLICATION; we wrap in a DO block instead
-- so re-running doesn't fail with "relation already member".
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'engagement_recipients'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.engagement_recipients';
  END IF;
END $$;

-- Sanity check (uncomment to verify after running)
/*
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'engagement_recipients';
*/
