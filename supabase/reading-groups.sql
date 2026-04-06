-- Reading Groups feature
-- Run this in Supabase SQL Editor
-- If re-running, drop existing tables first:
-- DROP TABLE IF EXISTS group_reviews, group_books, group_members, reading_groups CASCADE;

-- ============================================================
-- 1. Create all tables
-- ============================================================

CREATE TABLE reading_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '' NOT NULL,
  emoji TEXT DEFAULT '📚' NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE group_members (
  group_id UUID NOT NULL REFERENCES reading_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  email TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE group_books (
  group_id UUID NOT NULL REFERENCES reading_groups(id) ON DELETE CASCADE,
  isbn TEXT NOT NULL,
  title TEXT NOT NULL,
  cover_url TEXT,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_by_name TEXT,
  note_text TEXT,
  shared_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (group_id, isbn)
);

CREATE TABLE group_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES reading_groups(id) ON DELETE CASCADE,
  isbn TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (group_id, isbn, user_id)
);

CREATE TABLE group_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES reading_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT,
  type TEXT NOT NULL CHECK (type IN ('join', 'leave', 'share_book', 'review')),
  message TEXT,
  book_title TEXT,
  book_isbn TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================
-- 2. Enable RLS on all tables
-- ============================================================

ALTER TABLE reading_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_activity ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. Helper: security-definer function to get user's group ids
--    This avoids infinite recursion when group_members policies
--    need to query group_members itself.
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_group_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT group_id FROM group_members WHERE user_id = auth.uid();
$$;

-- ============================================================
-- 4. Policies
-- ============================================================

-- reading_groups
CREATE POLICY "Anyone can find by invite code"
  ON reading_groups FOR SELECT
  USING (true);

CREATE POLICY "Creator can manage groups"
  ON reading_groups FOR ALL
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- group_members: use security-definer function to avoid recursion
CREATE POLICY "Members can read group members"
  ON group_members FOR SELECT
  USING (group_id IN (SELECT get_my_group_ids()));

CREATE POLICY "Users can join/leave"
  ON group_members FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- group_books
CREATE POLICY "Members can read group books"
  ON group_books FOR SELECT
  USING (group_id IN (SELECT get_my_group_ids()));

CREATE POLICY "Members can share books"
  ON group_books FOR INSERT
  WITH CHECK (group_id IN (SELECT get_my_group_ids()));

CREATE POLICY "Sharers can update their shares"
  ON group_books FOR UPDATE
  USING (auth.uid() = shared_by);

-- group_reviews
CREATE POLICY "Members can read reviews"
  ON group_reviews FOR SELECT
  USING (group_id IN (SELECT get_my_group_ids()));

CREATE POLICY "Users can manage own reviews"
  ON group_reviews FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- group_activity
CREATE POLICY "Members can read activity"
  ON group_activity FOR SELECT
  USING (group_id IN (SELECT get_my_group_ids()));

CREATE POLICY "Users can create activity"
  ON group_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);
