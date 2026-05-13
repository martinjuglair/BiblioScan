-- ============================================================
-- Engagement admin RPCs — dashboard CRUD on campaigns
-- ------------------------------------------------------------
-- These functions are how the password-gated /admin dashboard
-- interacts with the engagement tables. Same pattern as
-- admin_dashboard_metrics: the password is verified server-side
-- via `verify_admin_password` (already installed by
-- supabase/admin-dashboard.sql), and the function runs as
-- security definer so it can read/write the otherwise-locked-down
-- engagement_campaigns table.
--
-- Run AFTER both:
--   - admin-dashboard.sql (which sets up the password helper)
--   - engagement-schema.sql (which creates the tables)
--
-- Idempotent. Safe to re-run.
-- ============================================================


-- ---------- 1. admin_list_campaigns — for the campaign list view ----------

CREATE OR REPLACE FUNCTION public.admin_list_campaigns(p_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  result json;
BEGIN
  IF NOT public.verify_admin_password(p_password) THEN
    RAISE EXCEPTION 'Invalid password' USING ERRCODE = '42501';
  END IF;

  SELECT json_agg(row_to_json(c) ORDER BY c.created_at DESC) INTO result
  FROM (
    SELECT
      id, name, push_title, push_body, push_deep_link,
      inapp_title, inapp_body, inapp_cta_label, inapp_cta_link,
      segment, status, sent_at, created_at,
      recipient_count, delivered_count, opened_count, clicked_count
    FROM public.engagement_campaigns
    ORDER BY created_at DESC
    LIMIT 50
  ) c;

  RETURN coalesce(result, '[]'::json);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_campaigns(text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_list_campaigns(text) TO anon, authenticated;


-- ---------- 2. admin_create_campaign — saves a draft ----------

CREATE OR REPLACE FUNCTION public.admin_create_campaign(
  p_password       text,
  p_name           text,
  p_push_title     text,
  p_push_body      text,
  p_push_deep_link text,
  p_inapp_title    text,
  p_inapp_body     text,
  p_inapp_cta_label text,
  p_inapp_cta_link text,
  p_inapp_image_url text,
  p_segment        text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF NOT public.verify_admin_password(p_password) THEN
    RAISE EXCEPTION 'Invalid password' USING ERRCODE = '42501';
  END IF;

  IF p_segment IS NULL OR p_segment = '' THEN
    p_segment := 'all';
  END IF;
  IF p_name IS NULL OR p_name = '' THEN
    RAISE EXCEPTION 'Campaign name is required';
  END IF;
  IF (p_push_title IS NULL OR p_push_title = '')
     AND (p_inapp_title IS NULL OR p_inapp_title = '') THEN
    RAISE EXCEPTION 'Campaign needs at least a push title or an in-app title';
  END IF;

  INSERT INTO public.engagement_campaigns (
    name, push_title, push_body, push_deep_link,
    inapp_title, inapp_body, inapp_cta_label, inapp_cta_link, inapp_image_url,
    segment, status
  ) VALUES (
    p_name,
    nullif(p_push_title, ''),
    nullif(p_push_body, ''),
    nullif(p_push_deep_link, ''),
    nullif(p_inapp_title, ''),
    nullif(p_inapp_body, ''),
    nullif(p_inapp_cta_label, ''),
    nullif(p_inapp_cta_link, ''),
    nullif(p_inapp_image_url, ''),
    p_segment,
    'draft'
  )
  RETURNING id INTO new_id;

  RETURN json_build_object('id', new_id, 'status', 'draft');
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_campaign(text, text, text, text, text, text, text, text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_create_campaign(text, text, text, text, text, text, text, text, text, text, text) TO anon, authenticated;


-- ---------- 3. admin_delete_campaign — drafts + tests ----------
-- Real "sent" campaigns are immutable (audit trail). Drafts can be
-- deleted freely. Test campaigns (name starts with "[TEST") are
-- considered ephemeral debug data and can be deleted whatever their
-- status — they accumulate in the list and the admin wants to clean
-- them up periodically.

CREATE OR REPLACE FUNCTION public.admin_delete_campaign(
  p_password    text,
  p_campaign_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_status text;
  current_name   text;
BEGIN
  IF NOT public.verify_admin_password(p_password) THEN
    RAISE EXCEPTION 'Invalid password' USING ERRCODE = '42501';
  END IF;

  SELECT status, name INTO current_status, current_name
  FROM public.engagement_campaigns
  WHERE id = p_campaign_id;

  IF current_status IS NULL THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;

  -- Allowed if it's a draft OR a test campaign (regardless of status)
  IF current_status != 'draft'
     AND (current_name IS NULL OR current_name NOT LIKE '[TEST%') THEN
    RAISE EXCEPTION 'Only draft or test campaigns can be deleted (this one is % "%")', current_status, current_name;
  END IF;

  DELETE FROM public.engagement_campaigns WHERE id = p_campaign_id;
  RETURN json_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_campaign(text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_delete_campaign(text, uuid) TO anon, authenticated;


-- ---------- 4. admin_segment_count — for the "(N users)" preview ----------

CREATE OR REPLACE FUNCTION public.admin_segment_count(
  p_password text,
  p_segment  text
)
RETURNS int
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  c int;
BEGIN
  IF NOT public.verify_admin_password(p_password) THEN
    RAISE EXCEPTION 'Invalid password' USING ERRCODE = '42501';
  END IF;
  SELECT count(*) INTO c FROM public.resolve_segment(p_segment);
  RETURN c;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_segment_count(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_segment_count(text, text) TO anon, authenticated;


-- ---------- 5. admin_send_campaign — orchestrates the send ----------
-- Note: this RPC does the heavy DB work (resolve segment → insert
-- recipients → mark campaign as 'sending'). The actual Expo Push API
-- call lives in the send_campaign Edge Function, which calls this
-- RPC first to get the list of (user_id, token) tuples to push to.

CREATE OR REPLACE FUNCTION public.admin_prepare_send_campaign(
  p_password    text,
  p_campaign_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  campaign     record;
  segment_size int;
  result       json;
BEGIN
  IF NOT public.verify_admin_password(p_password) THEN
    RAISE EXCEPTION 'Invalid password' USING ERRCODE = '42501';
  END IF;

  -- Lock the campaign row so two concurrent sends can't race.
  SELECT * INTO campaign
  FROM public.engagement_campaigns
  WHERE id = p_campaign_id
  FOR UPDATE;

  IF campaign IS NULL THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;
  IF campaign.status NOT IN ('draft', 'failed') THEN
    RAISE EXCEPTION 'Campaign already in status %, cannot re-send', campaign.status;
  END IF;

  -- Resolve audience
  WITH targets AS (
    SELECT user_id FROM public.resolve_segment(campaign.segment)
  )
  INSERT INTO public.engagement_recipients (campaign_id, user_id)
  SELECT p_campaign_id, t.user_id
  FROM targets t
  ON CONFLICT (campaign_id, user_id) DO NOTHING;

  SELECT count(*) INTO segment_size
  FROM public.engagement_recipients
  WHERE campaign_id = p_campaign_id;

  -- Move to "sending" — Edge Function flips to "sent" once Expo
  -- accepted the batch, or "failed" if it bombed out.
  UPDATE public.engagement_campaigns
  SET status = 'sending', recipient_count = segment_size
  WHERE id = p_campaign_id;

  -- Return audience + payload so the Edge Function can fan out to
  -- Expo Push API without doing another DB round-trip.
  SELECT json_build_object(
    'campaign', row_to_json(c),
    'recipients', (
      SELECT json_agg(json_build_object(
        'user_id', r.user_id,
        'token', t.token,
        'platform', t.platform
      ))
      FROM public.engagement_recipients r
      JOIN public.push_tokens t ON t.user_id = r.user_id
      WHERE r.campaign_id = p_campaign_id
        AND r.push_sent_at IS NULL
    )
  )
  INTO result
  FROM public.engagement_campaigns c
  WHERE c.id = p_campaign_id;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_prepare_send_campaign(text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_prepare_send_campaign(text, uuid) TO anon, authenticated;


-- ---------- 6. admin_get_push_tokens_for_email — for test push ----------
-- Used by the send_test_push Edge Function: looks up the target
-- user's push tokens by email. Returns an empty array if the user
-- doesn't exist or hasn't registered any device.
--
-- Why not let the function query auth.users directly? Because the
-- Edge Function runs as service_role and could technically scan the
-- whole auth.users table — wrapping it here adds a tiny audit
-- surface and keeps the SECURITY DEFINER pattern consistent.

CREATE OR REPLACE FUNCTION public.admin_get_push_tokens_for_email(
  p_password text,
  p_email    text
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  target_user_id uuid;
  tokens json;
BEGIN
  IF NOT public.verify_admin_password(p_password) THEN
    RAISE EXCEPTION 'Invalid password' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO target_user_id
  FROM auth.users
  WHERE lower(email) = lower(trim(p_email))
    AND deleted_at IS NULL
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found with email %', p_email;
  END IF;

  SELECT json_agg(json_build_object(
    'user_id', t.user_id,
    'token', t.token,
    'platform', t.platform
  ))
  INTO tokens
  FROM public.push_tokens t
  WHERE t.user_id = target_user_id;

  RETURN json_build_object(
    'user_id', target_user_id,
    'tokens', coalesce(tokens, '[]'::json)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_push_tokens_for_email(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_get_push_tokens_for_email(text, text) TO anon, authenticated;


-- ---------- 7. admin_create_test_inapp — one-shot in-app to one user ----------
-- Used by the dashboard's "Tester sur un email" button when the
-- campaign type is "in-app" (or "both" — the in-app side of "both").
-- Creates a real campaign in status='sent' with a [TEST] name prefix
-- + ONE recipient row pointing at the target user. The mobile
-- EngagementBanner will pick it up at the next foreground transition.
--
-- Why a real campaign (not ephemeral): the engagement_recipients
-- table has a NOT NULL foreign key to engagement_campaigns. We need
-- the row to make the banner show up. Test campaigns are visible in
-- the campaign list with their [TEST] prefix so the admin can
-- recognise + delete them later.

CREATE OR REPLACE FUNCTION public.admin_create_test_inapp(
  p_password         text,
  p_email            text,
  p_inapp_title      text,
  p_inapp_body       text,
  p_inapp_cta_label  text,
  p_inapp_cta_link   text,
  p_inapp_image_url  text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  target_user_id uuid;
  new_id         uuid;
BEGIN
  IF NOT public.verify_admin_password(p_password) THEN
    RAISE EXCEPTION 'Invalid password' USING ERRCODE = '42501';
  END IF;

  IF p_inapp_title IS NULL OR p_inapp_title = '' THEN
    RAISE EXCEPTION 'In-app title required';
  END IF;

  SELECT id INTO target_user_id
  FROM auth.users
  WHERE lower(email) = lower(trim(p_email))
    AND deleted_at IS NULL
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found with email %', p_email;
  END IF;

  INSERT INTO public.engagement_campaigns (
    name,
    inapp_title, inapp_body, inapp_cta_label, inapp_cta_link, inapp_image_url,
    segment, status, sent_at, recipient_count, delivered_count
  ) VALUES (
    '[TEST in-app] ' || to_char(now(), 'DD/MM HH24:MI') || ' → ' || p_email,
    nullif(p_inapp_title, ''),
    nullif(p_inapp_body, ''),
    nullif(p_inapp_cta_label, ''),
    nullif(p_inapp_cta_link, ''),
    nullif(p_inapp_image_url, ''),
    'all',           -- irrelevant for tests, but column is NOT NULL
    'sent',
    now(),
    1,
    0
  )
  RETURNING id INTO new_id;

  INSERT INTO public.engagement_recipients (campaign_id, user_id)
  VALUES (new_id, target_user_id);

  RETURN json_build_object(
    'campaign_id', new_id,
    'user_id', target_user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_test_inapp(text, text, text, text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_create_test_inapp(text, text, text, text, text, text, text) TO anon, authenticated;


-- ---------- 8. admin_mark_campaign_sent — final state transition ----------
-- Called by the Edge Function once it has finished pushing to Expo.

CREATE OR REPLACE FUNCTION public.admin_mark_campaign_sent(
  p_password    text,
  p_campaign_id uuid,
  p_delivered   int,
  p_failed      int
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.verify_admin_password(p_password) THEN
    RAISE EXCEPTION 'Invalid password' USING ERRCODE = '42501';
  END IF;

  UPDATE public.engagement_campaigns
  SET
    status = CASE WHEN p_failed = recipient_count THEN 'failed' ELSE 'sent' END,
    sent_at = now(),
    delivered_count = p_delivered
  WHERE id = p_campaign_id;

  RETURN json_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_mark_campaign_sent(text, uuid, int, int) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_mark_campaign_sent(text, uuid, int, int) TO anon, authenticated;
