-- Group Activity feed
-- Run this in Supabase SQL Editor (after reading-groups.sql)

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

ALTER TABLE group_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read activity"
  ON group_activity FOR SELECT
  USING (group_id IN (SELECT get_my_group_ids()));

CREATE POLICY "Users can create activity"
  ON group_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);
