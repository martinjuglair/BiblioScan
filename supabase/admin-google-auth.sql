-- ============================================================
-- Admin auth migration: bcrypt password → Google OAuth
-- ------------------------------------------------------------
-- Replaces the shared-password admin gate (verify_admin_password +
-- admin_credentials table) with a Supabase-Auth-based check that
-- only lets a single hard-coded Gmail address through.
--
-- Why: a shared password is brittle (one leak = revoke + re-deploy
-- + comms), can't be revoked per-device, and shows up in every RPC
-- call as a plain-text param. With Google OAuth gate:
--   • Supabase Auth handles the session → token rotation, etc.
--   • Frontend never holds a password
--   • verify_admin() reads the JWT's `email` claim server-side, so
--     even a tampered client can't bypass it
--   • Revoking access = changing the email in this function and
--     re-deploying (or signing out from accounts.google.com)
--
-- Run order on Supabase SQL Editor:
--   1. This file (admin-google-auth.sql) → drops old gate + creates
--      verify_admin()
--   2. admin-dashboard.sql               → recreates admin_dashboard_metrics
--   3. admin-recent-users.sql            → recreates admin_recent_users
--   4. engagement-admin-rpcs.sql         → recreates the 8 engagement RPCs
--
-- All files are idempotent. Safe to re-run.
-- ============================================================

-- ---- 0. New gate: verify_admin() reading auth.jwt() -----------------
-- Hard-codes the single authorized admin email. To change it later,
-- replace the literal and re-run this file.
CREATE OR REPLACE FUNCTION public.verify_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- service_role bypass: Edge Functions (send_campaign,
  -- send_test_push) run with the service-role key and don't carry a
  -- user JWT. They enforce admin identity themselves in Deno before
  -- calling our RPCs, so we trust the role here.
  IF coalesce(auth.role(), '') = 'service_role' THEN
    RETURN true;
  END IF;

  -- Regular client path: read the verified `email` claim baked into
  -- the JWT by Supabase Auth. A tampered client cannot lie about its
  -- email — Supabase validated the JWT signature before we see it.
  RETURN coalesce(auth.jwt() ->> 'email', '') = 'martin.juglair@gmail.com';
END;
$$;

REVOKE ALL ON FUNCTION public.verify_admin() FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.verify_admin() TO anon, authenticated;

-- ---- 1. Drop old admin RPCs with their text-password signatures ----
-- Each function gets recreated in its source file with the new
-- signature (no p_password) and a verify_admin() check. Without these
-- DROPs Postgres would keep both versions side by side via function
-- overloading.
DROP FUNCTION IF EXISTS public.admin_dashboard_metrics(text, int, timestamptz);
DROP FUNCTION IF EXISTS public.admin_recent_users(text, int);
DROP FUNCTION IF EXISTS public.admin_list_campaigns(text);
DROP FUNCTION IF EXISTS public.admin_create_campaign(text, text, text, text, text, text, text, text, jsonb);
DROP FUNCTION IF EXISTS public.admin_create_campaign(text, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.admin_delete_campaign(text, uuid);
DROP FUNCTION IF EXISTS public.admin_segment_count(text, text);
DROP FUNCTION IF EXISTS public.admin_prepare_send_campaign(text, uuid);
DROP FUNCTION IF EXISTS public.admin_get_push_tokens_for_email(text, text);
DROP FUNCTION IF EXISTS public.admin_create_test_inapp(text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.admin_create_test_inapp(text, text, text, text, text);
DROP FUNCTION IF EXISTS public.admin_mark_campaign_sent(text, uuid);

-- ---- 2. Drop the bcrypt machinery — no longer needed ---------------
DROP FUNCTION IF EXISTS public.verify_admin_password(text);
DROP TABLE     IF EXISTS public.admin_credentials;

-- Sanity check (uncomment after running to verify your email gets through):
/*
SELECT public.verify_admin();
*/
