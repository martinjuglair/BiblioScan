-- Pré-launch moderation primitives — required for Apple App Store
-- guideline 1.2 (User-Generated Content). The app must let users:
--   1. Flag objectionable content   → table `content_reports`
--   2. Block abusive users          → table `user_blocks`
-- Plus: blocked users' UGC must auto-disappear from the blocker's view.
--
-- Run AFTER `reading-groups.sql` (depends on group_reviews).
-- Idempotent: safe to re-run.

-- ============================================================
-- 1. content_reports — user signalements of UGC
-- ============================================================

CREATE TABLE IF NOT EXISTS content_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- The reported entity. Exactly ONE of these will be set per report.
  -- We store the "shape" of what was reported so a moderator can find
  -- it later without joining 4 tables.
  target_type TEXT NOT NULL CHECK (target_type IN ('review', 'group_book', 'user')),
  target_review_id UUID REFERENCES group_reviews(id) ON DELETE CASCADE,
  target_group_id UUID REFERENCES reading_groups(id) ON DELETE CASCADE,
  target_isbn TEXT,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  reason TEXT NOT NULL CHECK (reason IN (
    'spam', 'harassment', 'hate_speech', 'inappropriate', 'illegal', 'other'
  )),
  details TEXT,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'reviewed', 'actioned', 'dismissed'
  )),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_content_reports_status_created
  ON content_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter
  ON content_reports(reporter_user_id);

-- ============================================================
-- 2. user_blocks — A blocks B (B's UGC will be hidden from A)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (blocker_user_id, blocked_user_id),
  CHECK (blocker_user_id <> blocked_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker
  ON user_blocks(blocker_user_id);

-- ============================================================
-- 3. RLS policies
-- ============================================================

ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can submit reports" ON content_reports;
CREATE POLICY "Users can submit reports"
  ON content_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_user_id);

DROP POLICY IF EXISTS "Users can read their own reports" ON content_reports;
CREATE POLICY "Users can read their own reports"
  ON content_reports FOR SELECT
  USING (auth.uid() = reporter_user_id);

DROP POLICY IF EXISTS "Users manage their own blocks" ON user_blocks;
CREATE POLICY "Users manage their own blocks"
  ON user_blocks FOR ALL
  USING (auth.uid() = blocker_user_id)
  WITH CHECK (auth.uid() = blocker_user_id);

-- ============================================================
-- 4. Helper RPC: list IDs blocked by the current user.
--    Used by client queries to filter out their UGC ("WHERE
--    user_id NOT IN (SELECT * FROM get_my_blocked_ids())").
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_blocked_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT blocked_user_id FROM user_blocks WHERE blocker_user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION get_my_blocked_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_my_blocked_ids() TO authenticated;

-- ============================================================
-- 5. Sanity check
-- ============================================================

SELECT 'content_reports' AS table_name,
       (SELECT count(*) FROM information_schema.tables
        WHERE table_name = 'content_reports' AND table_schema = 'public') AS exists_count
UNION ALL
SELECT 'user_blocks',
       (SELECT count(*) FROM information_schema.tables
        WHERE table_name = 'user_blocks' AND table_schema = 'public');
