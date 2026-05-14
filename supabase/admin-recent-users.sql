-- ============================================================
-- Admin RPC: list all recently created accounts
-- ------------------------------------------------------------
-- The existing `top_users` block of `admin_dashboard_metrics`
-- only surfaces users who have at least one book (ORDER BY
-- book_count DESC, LIMIT 10) — which means ghost accounts (just
-- signed up, no activity yet) are invisible. This RPC fills that
-- blind spot: returns the N most recent signups, regardless of
-- activity, with a few useful counters so the admin can spot
-- inactive cohorts.
--
-- Returns JSON array of users sorted by created_at DESC.
-- Gated by verify_admin_password() — same guard as the rest.
--
-- Idempotent: CREATE OR REPLACE.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_recent_users(
  p_password text,
  p_limit    int DEFAULT 50
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  result json;
BEGIN
  -- Same admin gate as every other admin_* RPC. Throws on mismatch.
  IF NOT public.verify_admin_password(p_password) THEN
    RAISE EXCEPTION 'Invalid password';
  END IF;

  -- Clamp to avoid pathological values
  IF p_limit IS NULL OR p_limit < 1 THEN p_limit := 50; END IF;
  IF p_limit > 500 THEN p_limit := 500; END IF;

  SELECT json_agg(row_to_json(t) ORDER BY t.created_at DESC) INTO result FROM (
    SELECT
      u.id,
      coalesce(u.raw_user_meta_data->>'first_name', u.email) AS display_name,
      u.email,
      u.created_at,
      u.last_sign_in_at,
      u.email_confirmed_at IS NOT NULL AS email_confirmed,
      coalesce((
        SELECT count(*) FROM public.comic_books b WHERE b.user_id = u.id
      ), 0)::int AS book_count,
      coalesce((
        SELECT count(*) FROM public.comic_books b
        WHERE b.user_id = u.id AND b.is_read
      ), 0)::int AS read_count,
      coalesce((
        SELECT count(*) FROM public.group_members gm WHERE gm.user_id = u.id
      ), 0)::int AS group_count
    FROM auth.users u
    ORDER BY u.created_at DESC
    LIMIT p_limit
  ) t;

  RETURN coalesce(result, '[]'::json);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_recent_users(text, int) FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.admin_recent_users(text, int) TO anon, authenticated;

-- Sanity test (uncomment + replace password to verify after install):
/*
SELECT public.admin_recent_users('your_password_here', 5);
*/
