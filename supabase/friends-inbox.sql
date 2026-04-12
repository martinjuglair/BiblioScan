-- Friends & Inbox feature
-- Run in Supabase SQL Editor

-- ============================================================
-- 1. Tables
-- ============================================================

CREATE TABLE friend_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_user_name TEXT,
  invite_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT,
  friend_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, friend_id),
  CHECK (user_id <> friend_id)
);

CREATE INDEX idx_friendships_user ON friendships(user_id);
CREATE INDEX idx_friendships_friend ON friendships(friend_id);

CREATE TABLE direct_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_user_name TEXT,
  isbn TEXT NOT NULL,
  title TEXT NOT NULL,
  cover_url TEXT,
  message TEXT,
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  comment TEXT,
  type TEXT NOT NULL DEFAULT 'share' CHECK (type IN ('share', 'lend', 'return')),
  is_read BOOLEAN DEFAULT false NOT NULL,
  lend_returned BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_direct_shares_to ON direct_shares(to_user_id, created_at DESC);
CREATE INDEX idx_direct_shares_from ON direct_shares(from_user_id, created_at DESC);

-- ============================================================
-- 2. Enable RLS
-- ============================================================

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_shares ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. RLS Policies
-- ============================================================

-- friendships
CREATE POLICY "Users read own friendships"
  ON friendships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users create friendships"
  ON friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own friendships"
  ON friendships FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- friend_invites
CREATE POLICY "Anyone can find invite by code"
  ON friend_invites FOR SELECT
  USING (true);

CREATE POLICY "Users manage own invites"
  ON friend_invites FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users delete own invites"
  ON friend_invites FOR DELETE
  USING (auth.uid() = from_user_id);

-- direct_shares
CREATE POLICY "Participants read shares"
  ON direct_shares FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Sender creates shares"
  ON direct_shares FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Participants update shares"
  ON direct_shares FOR UPDATE
  USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);
