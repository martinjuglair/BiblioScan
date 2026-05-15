-- ============================================================
-- Block unauthorized Google sign-ins from creating auth.users rows
-- ------------------------------------------------------------
-- Today the admin dashboard rejects non-admin emails at the UI
-- layer (AdminGoogleLogin shows a "Compte non autorisé" screen),
-- but Supabase Auth has already created an auth.users row for the
-- visitor by then — Google OAuth signs them in first, asks
-- questions later. Result: ghost accounts pile up in auth.users
-- whenever someone curious tries the admin URL.
--
-- This migration:
--   1. Adds a BEFORE INSERT trigger on auth.users that raises an
--      exception when a Google OAuth signup is attempted with any
--      email other than the admin's → Supabase Auth aborts the
--      user-creation transaction, no row written.
--   2. Cleans up rows that already accumulated (everything
--      provider=google AND email != admin).
--
-- Notes:
--   - The trigger only filters Google. Email/password signups and
--     Apple sign-in pass through untouched, so the mobile app's
--     auth flow is unaffected.
--   - If you ever open the regular app to Google sign-in in the
--     future, you'll need to widen this allowlist or drop the
--     trigger.
--   - Trigger is SECURITY DEFINER so it can operate on the auth
--     schema while being installed by anyone with execute rights
--     on the wrapping function.
--
-- Run order: after admin-google-auth.sql (no hard dependency, just
-- co-located for the admin auth story). Idempotent.
-- ============================================================


-- ---- 1. Trigger function: block non-admin Google signups -----------
CREATE OR REPLACE FUNCTION public.guard_admin_google_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Only intercept Google OAuth attempts. Other providers (email,
  -- apple, etc.) get a free pass — those are real app users.
  IF coalesce(NEW.raw_app_meta_data->>'provider', '') = 'google'
     AND coalesce(NEW.email, '') <> 'martin.juglair@gmail.com'
  THEN
    -- Raising here aborts the INSERT and the surrounding Supabase
    -- Auth transaction. The OAuth callback returns an error to the
    -- browser, which lands the visitor on the admin login screen
    -- with no leftover user row.
    RAISE EXCEPTION 'Google sign-in is restricted to the admin account'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

-- ---- 2. Wire the trigger up ----------------------------------------
-- DROP first so the script is safe to re-run after edits.
DROP TRIGGER IF EXISTS guard_admin_google_signup ON auth.users;

CREATE TRIGGER guard_admin_google_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_admin_google_signup();


-- ---- 3. Clean up rows that already slipped through -----------------
-- Runs once when the script is first executed. Deletes any Google
-- OAuth user who isn't the admin. Cascading FKs (identities,
-- push_tokens, etc.) take care of dependent rows.
DELETE FROM auth.users
WHERE coalesce(raw_app_meta_data->>'provider', '') = 'google'
  AND coalesce(email, '') <> 'martin.juglair@gmail.com';

-- Sanity check (uncomment to verify):
/*
SELECT id, email, raw_app_meta_data->>'provider' AS provider, created_at
FROM auth.users
WHERE coalesce(raw_app_meta_data->>'provider', '') = 'google'
ORDER BY created_at DESC;
*/
