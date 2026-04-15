-- Unify Friends & Groups
-- A friend = a private 2-person group. No more separate friendships table.
-- Run in Supabase SQL Editor AFTER friends-inbox.sql and friends-inbox-fix.sql

-- ============================================================
-- 1. Add is_private to reading_groups
-- ============================================================

ALTER TABLE reading_groups ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false NOT NULL;

-- ============================================================
-- 2. Migrate existing friendships → private groups
--    For each friendship pair (A→B), create ONE private group
-- ============================================================

DO $$
DECLARE
  r RECORD;
  v_group_id UUID;
BEGIN
  -- Process friendships, but only one direction (user_id < friend_id) to avoid duplicates
  FOR r IN
    SELECT DISTINCT
      LEAST(f.user_id, f.friend_id) AS user_a,
      GREATEST(f.user_id, f.friend_id) AS user_b,
      f.user_name AS name_a,
      f.friend_name AS name_b,
      f.created_at
    FROM friendships f
    WHERE f.user_id < f.friend_id
  LOOP
    -- Create private group
    INSERT INTO reading_groups (name, description, emoji, created_by, invite_code, is_private, created_at)
      VALUES (
        COALESCE(r.name_a, 'Ami') || ' & ' || COALESCE(r.name_b, 'Ami'),
        '',
        '👤',
        r.user_a,
        gen_random_uuid()::text,
        true,
        r.created_at
      )
      RETURNING id INTO v_group_id;

    -- Add both as members
    INSERT INTO group_members (group_id, user_id, first_name, email, role)
      SELECT v_group_id, r.user_a,
        COALESCE((SELECT raw_user_meta_data->>'first_name' FROM auth.users WHERE id = r.user_a), r.name_a),
        COALESCE((SELECT email FROM auth.users WHERE id = r.user_a), ''),
        'admin';

    INSERT INTO group_members (group_id, user_id, first_name, email, role)
      SELECT v_group_id, r.user_b,
        COALESCE((SELECT raw_user_meta_data->>'first_name' FROM auth.users WHERE id = r.user_b), r.name_b),
        COALESCE((SELECT email FROM auth.users WHERE id = r.user_b), ''),
        'member';
  END LOOP;
END $$;

-- ============================================================
-- 3. Migrate direct_shares → group_books + group_activity
--    Share a book in each corresponding private group
-- ============================================================

DO $$
DECLARE
  ds RECORD;
  v_group_id UUID;
BEGIN
  FOR ds IN
    SELECT * FROM direct_shares ORDER BY created_at ASC
  LOOP
    -- Find the private group between sender and receiver
    SELECT gm1.group_id INTO v_group_id
      FROM group_members gm1
      JOIN group_members gm2 ON gm1.group_id = gm2.group_id
      JOIN reading_groups rg ON rg.id = gm1.group_id
      WHERE gm1.user_id = ds.from_user_id
        AND gm2.user_id = ds.to_user_id
        AND rg.is_private = true
      LIMIT 1;

    IF v_group_id IS NOT NULL THEN
      -- Add book to group (skip duplicates)
      INSERT INTO group_books (group_id, isbn, title, cover_url, shared_by, shared_by_name, note_text, shared_at)
        VALUES (v_group_id, ds.isbn, ds.title, ds.cover_url, ds.from_user_id, ds.from_user_name, ds.message, ds.created_at)
        ON CONFLICT (group_id, isbn) DO NOTHING;

      -- Add activity
      INSERT INTO group_activity (group_id, user_id, user_name, type, message, book_title, book_isbn, created_at)
        VALUES (v_group_id, ds.from_user_id, ds.from_user_name, 'share_book', ds.message, ds.title, ds.isbn, ds.created_at);

      -- Migrate reviews (rating) as group_reviews
      IF ds.rating IS NOT NULL THEN
        INSERT INTO group_reviews (group_id, isbn, user_id, user_name, rating, comment, created_at)
          VALUES (v_group_id, ds.isbn, ds.from_user_id, ds.from_user_name, ds.rating, ds.comment, ds.created_at)
          ON CONFLICT (group_id, isbn, user_id) DO NOTHING;
      END IF;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 4. Update accept_friend_invite to create a private group
-- ============================================================

CREATE OR REPLACE FUNCTION accept_friend_invite(p_invite_code TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite friend_invites%ROWTYPE;
  v_user_id UUID;
  v_user_name TEXT;
  v_user_email TEXT;
  v_inviter_email TEXT;
  v_group_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non connecté';
  END IF;

  -- Find invite
  SELECT * INTO v_invite FROM friend_invites WHERE invite_code = UPPER(p_invite_code);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Code introuvable';
  END IF;

  IF v_invite.from_user_id = v_user_id THEN
    RAISE EXCEPTION 'Vous ne pouvez pas vous ajouter vous-même';
  END IF;

  -- Get current user info
  SELECT COALESCE(raw_user_meta_data->>'first_name', split_part(email, '@', 1)),
         email
    INTO v_user_name, v_user_email
    FROM auth.users WHERE id = v_user_id;

  -- Get inviter email
  SELECT email INTO v_inviter_email
    FROM auth.users WHERE id = v_invite.from_user_id;

  -- Check if a private group already exists between these two users
  SELECT gm1.group_id INTO v_group_id
    FROM group_members gm1
    JOIN group_members gm2 ON gm1.group_id = gm2.group_id
    JOIN reading_groups rg ON rg.id = gm1.group_id
    WHERE gm1.user_id = v_user_id
      AND gm2.user_id = v_invite.from_user_id
      AND rg.is_private = true
    LIMIT 1;

  IF v_group_id IS NULL THEN
    -- Create a private 2-person group
    INSERT INTO reading_groups (name, description, emoji, created_by, invite_code, is_private)
      VALUES (
        COALESCE(v_invite.from_user_name, 'Ami') || ' & ' || v_user_name,
        '',
        '👤',
        v_invite.from_user_id,
        gen_random_uuid()::text,
        true
      )
      RETURNING id INTO v_group_id;

    -- Add inviter as admin
    INSERT INTO group_members (group_id, user_id, first_name, email, role)
      VALUES (v_group_id, v_invite.from_user_id, v_invite.from_user_name, COALESCE(v_inviter_email, ''), 'admin');

    -- Add accepter as member
    INSERT INTO group_members (group_id, user_id, first_name, email, role)
      VALUES (v_group_id, v_user_id, v_user_name, COALESCE(v_user_email, ''), 'member');
  END IF;

  -- Delete the invite
  DELETE FROM friend_invites WHERE id = v_invite.id;
END;
$$;

-- ============================================================
-- 5. Index for fast private group lookup
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_reading_groups_private ON reading_groups(is_private) WHERE is_private = true;
