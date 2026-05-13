-- ============================================================
-- Engagement tool — push notifications + in-app messages
-- ------------------------------------------------------------
-- Foundations for the Ploom "mini-Braze" admin tool. Three tables
-- and one helper RPC, all gated by RLS so even with the anon key
-- nobody can read other users' tokens or campaign data.
--
-- Run this whole file in the Supabase SQL Editor on bd-collection's
-- project. Idempotent — `CREATE … IF NOT EXISTS` is used everywhere
-- so reruns are safe.
--
-- See /Users/martinj/Desktop/BookPapa/engagement-plan.md for the full
-- product / architecture context.
-- ============================================================


-- ---------- 1. push_tokens ----------
-- One row per (user, device) — a single user can have multiple
-- entries (phone + tablet, primary + backup, etc.). Stored in plain
-- text since Expo push tokens are not secrets per se, but we still
-- gate access via RLS so users only see their own tokens.

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token         text NOT NULL,                                   -- ExponentPushToken[...]
  platform      text NOT NULL CHECK (platform IN ('ios','android')),
  device_id     text,                                            -- optional, for dedup on reinstall
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON public.push_tokens(user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- A user manages only their own tokens. The mobile app upserts here
-- on every cold start so the `last_seen_at` doubles as a "this device
-- is still alive" heartbeat.
DROP POLICY IF EXISTS "users manage own push_tokens" ON public.push_tokens;
CREATE POLICY "users manage own push_tokens"
  ON public.push_tokens
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ---------- 2. engagement_campaigns ----------
-- A campaign is one outbound communication: push + optional in-app
-- banner shown on next app open. Targeting is by `segment` slug
-- (see resolve_segment() below).

CREATE TABLE IF NOT EXISTS public.engagement_campaigns (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL,                              -- internal label
  -- Push notification
  push_title         text,
  push_body          text,
  push_deep_link     text,                                       -- "ploom://b/9782..." optional
  -- In-app message (optional — campaign can be push-only)
  inapp_title        text,
  inapp_body         text,
  inapp_cta_label    text,                                       -- "Voir le livre"
  inapp_cta_link     text,                                       -- "ploom://group/abc"
  inapp_image_url    text,                                       -- optional banner image
  -- Targeting
  segment            text NOT NULL DEFAULT 'all',                -- see resolve_segment slugs
  -- Lifecycle
  status             text NOT NULL DEFAULT 'draft',              -- 'draft' | 'sending' | 'sent' | 'failed'
  scheduled_at       timestamptz,                                -- null = manual send
  sent_at            timestamptz,
  created_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  -- Denormalised aggregates (faster dashboard queries)
  recipient_count    int NOT NULL DEFAULT 0,
  delivered_count    int NOT NULL DEFAULT 0,
  opened_count       int NOT NULL DEFAULT 0,
  clicked_count      int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_engagement_campaigns_status
  ON public.engagement_campaigns(status, scheduled_at);

ALTER TABLE public.engagement_campaigns ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT/UPDATE/DELETE policies for `authenticated` —
-- campaigns are admin-only. The dashboard accesses them through the
-- existing admin_* security-definer RPCs (to be added in next phase).


-- ---------- 3. engagement_recipients ----------
-- One row per (campaign, user). Tracks push + in-app state per
-- recipient so the dashboard can show open / click rates.

CREATE TABLE IF NOT EXISTS public.engagement_recipients (
  campaign_id        uuid NOT NULL REFERENCES public.engagement_campaigns(id) ON DELETE CASCADE,
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Push state
  push_sent_at       timestamptz,                                -- when we pushed to Expo API
  push_delivered_at  timestamptz,                                -- delivery receipt from Expo
  push_error         text,                                       -- "DeviceNotRegistered" etc.
  -- In-app state
  inapp_shown_at     timestamptz,                                -- when banner shown to user
  inapp_clicked_at   timestamptz,                                -- if CTA tapped
  inapp_dismissed_at timestamptz,                                -- if explicitly dismissed
  PRIMARY KEY (campaign_id, user_id)
);

-- Partial index for the most common mobile query: "any unread in-app
-- messages for me right now?". The WHERE clause keeps the index tiny.
CREATE INDEX IF NOT EXISTS idx_recipients_unread_inapp
  ON public.engagement_recipients(user_id)
  WHERE inapp_shown_at IS NULL AND inapp_dismissed_at IS NULL;

ALTER TABLE public.engagement_recipients ENABLE ROW LEVEL SECURITY;

-- A user reads only their own recipient rows (used by the mobile app
-- to fetch pending in-app messages).
DROP POLICY IF EXISTS "users read own recipients" ON public.engagement_recipients;
CREATE POLICY "users read own recipients"
  ON public.engagement_recipients
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- And updates their own in-app state (shown / clicked / dismissed).
DROP POLICY IF EXISTS "users update own recipients" ON public.engagement_recipients;
CREATE POLICY "users update own recipients"
  ON public.engagement_recipients
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
-- INSERT and DELETE are admin-only (via send_campaign Edge Function).


-- ---------- 4. resolve_segment(slug) ----------
-- Returns the list of user_ids matching a segment. Used by the
-- send_campaign Edge Function to compute the audience for a campaign.
-- Centralising the SQL keeps the segments in one tested place.

CREATE OR REPLACE FUNCTION public.resolve_segment(slug text)
RETURNS TABLE(user_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  CASE slug
    WHEN 'all' THEN
      RETURN QUERY SELECT id FROM auth.users WHERE deleted_at IS NULL;
    WHEN 'new_7d' THEN
      RETURN QUERY SELECT id FROM auth.users
        WHERE deleted_at IS NULL AND created_at >= now() - interval '7 days';
    WHEN 'inactive_30d' THEN
      RETURN QUERY SELECT id FROM auth.users
        WHERE deleted_at IS NULL
          AND coalesce(last_sign_in_at, created_at) < now() - interval '30 days';
    WHEN 'no_book' THEN
      RETURN QUERY SELECT u.id FROM auth.users u
        WHERE u.deleted_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM public.comic_books cb WHERE cb.user_id = u.id);
    WHEN 'with_book' THEN
      RETURN QUERY SELECT DISTINCT cb.user_id FROM public.comic_books cb
        WHERE cb.user_id IS NOT NULL;
    WHEN 'in_group' THEN
      RETURN QUERY SELECT DISTINCT gm.user_id FROM public.group_members gm
        WHERE gm.user_id IS NOT NULL;
    WHEN 'without_group' THEN
      RETURN QUERY SELECT u.id FROM auth.users u
        WHERE u.deleted_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.user_id = u.id);
    ELSE
      RAISE EXCEPTION 'Unknown segment slug: %', slug;
  END CASE;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_segment(text) FROM public;
-- Admin-only via dashboard's admin RPCs (so we don't expose the
-- segment counts to anon clients).
GRANT EXECUTE ON FUNCTION public.resolve_segment(text) TO service_role;


-- ---------- 5. count_segment(slug) — preview count ----------
-- Lightweight helper the dashboard calls when the admin selects a
-- segment in the compose form, so the "(N users)" preview is live.

CREATE OR REPLACE FUNCTION public.count_segment(slug text)
RETURNS int
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  c int;
BEGIN
  SELECT count(*) INTO c FROM public.resolve_segment(slug);
  RETURN c;
END;
$$;

REVOKE ALL ON FUNCTION public.count_segment(text) FROM public;
GRANT EXECUTE ON FUNCTION public.count_segment(text) TO service_role;


-- ============================================================
-- Smoke tests (commented — copy/paste in SQL Editor to verify)
-- ============================================================
/*
-- Confirm tables exist
SELECT count(*) FROM public.push_tokens;
SELECT count(*) FROM public.engagement_campaigns;
SELECT count(*) FROM public.engagement_recipients;

-- Confirm RLS is on
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname IN ('push_tokens', 'engagement_campaigns', 'engagement_recipients');

-- Test resolve_segment (must be run as service_role or via Edge Function)
SELECT count(*) FROM public.resolve_segment('all');
SELECT count(*) FROM public.resolve_segment('new_7d');
SELECT count(*) FROM public.resolve_segment('no_book');
*/
