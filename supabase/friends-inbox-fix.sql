-- Fix: RLS blocks inserting the reverse friendship row
-- Solution: SECURITY DEFINER function that creates both rows

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

  -- Get current user name
  SELECT COALESCE(raw_user_meta_data->>'first_name', split_part(email, '@', 1))
    INTO v_user_name
    FROM auth.users WHERE id = v_user_id;

  -- Create both friendship directions
  INSERT INTO friendships (user_id, friend_id, user_name, friend_name)
    VALUES (v_user_id, v_invite.from_user_id, v_user_name, v_invite.from_user_name)
    ON CONFLICT (user_id, friend_id) DO NOTHING;

  INSERT INTO friendships (user_id, friend_id, user_name, friend_name)
    VALUES (v_invite.from_user_id, v_user_id, v_invite.from_user_name, v_user_name)
    ON CONFLICT (user_id, friend_id) DO NOTHING;

  -- Delete the invite
  DELETE FROM friend_invites WHERE id = v_invite.id;
END;
$$;
