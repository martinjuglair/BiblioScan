-- ============================================================
-- Admin dashboard RPCs — password-gated
-- ------------------------------------------------------------
-- Public access to the LP makes Supabase-auth-based gating
-- impractical (there's no login UI on the web), so the
-- dashboard auths against a single bcrypt-hashed password
-- stored in `public.admin_credentials`. The hash is read only
-- by the security-definer function — RLS blocks any direct
-- SELECT from clients, even with the service-role key revoked.
--
-- To install / rotate the password:
--   1. Run this whole file once (it creates tables + functions
--      but does NOT set a password)
--   2. Run the snippet at the bottom (commented out) with your
--      chosen password substituted in
--
-- The dashboard RPC `admin_dashboard_metrics(p, days)` takes
-- the password as its first argument and raises an exception
-- if it doesn't match. The client stores the password in
-- sessionStorage so the user types it once per session.
-- ============================================================

-- ---------- 0. Required extensions ----------
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ---------- 1. Credentials table (single-row by design) ----------
CREATE TABLE IF NOT EXISTS public.admin_credentials (
  id            integer     PRIMARY KEY DEFAULT 1,
  password_hash text        NOT NULL,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_credentials_single_row CHECK (id = 1)
);

ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;
-- Intentionally NO policies: clients can never SELECT/INSERT/UPDATE
-- directly. Only security-definer functions reach the data.


-- ---------- 2. Password verification helper ----------
CREATE OR REPLACE FUNCTION public.verify_admin_password(p_password text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_hash text;
BEGIN
  IF p_password IS NULL OR length(p_password) = 0 THEN
    RETURN false;
  END IF;
  SELECT password_hash INTO stored_hash
  FROM public.admin_credentials
  WHERE id = 1;
  IF stored_hash IS NULL THEN
    RETURN false;
  END IF;
  RETURN stored_hash = crypt(p_password, stored_hash);
END;
$$;

REVOKE ALL ON FUNCTION public.verify_admin_password(text) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_admin_password(text) TO anon, authenticated;


-- ---------- 3. Main metrics RPC (password-gated) ----------
CREATE OR REPLACE FUNCTION public.admin_dashboard_metrics(
  p_password   text,
  period_days  int DEFAULT 30
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  result json;
  start_ts timestamptz;
  total_users int;
BEGIN
  -- Password guard
  IF NOT public.verify_admin_password(p_password) THEN
    RAISE EXCEPTION 'Invalid password' USING ERRCODE = '42501';
  END IF;

  -- Clamp the period to something sensible
  IF period_days IS NULL OR period_days <= 0 THEN
    period_days := 30;
  END IF;
  IF period_days > 365 THEN
    period_days := 365;
  END IF;

  start_ts := date_trunc('day', now()) - ((period_days - 1) || ' days')::interval;

  SELECT count(*) INTO total_users FROM auth.users;

  SELECT json_build_object(
    -- ---------- totals (lifetime) ----------
    'totals', json_build_object(
      'users',  total_users,
      'books',  (SELECT count(*) FROM public.comic_books),
      'groups', (SELECT count(*) FROM public.reading_groups),
      'reads',  (SELECT count(*) FROM public.comic_books WHERE is_read = true),
      'group_members', (SELECT count(*) FROM public.group_members),
      'waitlist', (SELECT count(*) FROM public.waitlist)
    ),

    -- ---------- period stats (last N days) ----------
    'period', json_build_object(
      'days', period_days,
      'new_users',  (SELECT count(*) FROM auth.users          WHERE created_at  >= start_ts),
      'new_books',  (SELECT count(*) FROM public.comic_books  WHERE added_at    >= start_ts),
      'new_groups', (SELECT count(*) FROM public.reading_groups WHERE created_at >= start_ts),
      'new_reads',  (SELECT count(*) FROM public.comic_books  WHERE read_at     >= start_ts),
      'new_waitlist', (SELECT count(*) FROM public.waitlist   WHERE signed_up_at >= start_ts)
    ),

    -- ---------- daily series (one row per day, zero-filled) ----------
    'daily', (
      SELECT json_agg(row_to_json(d) ORDER BY d.day) FROM (
        SELECT
          to_char(day_series, 'YYYY-MM-DD') AS day,
          coalesce(u.c, 0) AS users,
          coalesce(b.c, 0) AS books,
          coalesce(g.c, 0) AS groups,
          coalesce(r.c, 0) AS reads
        FROM generate_series(
               start_ts::date,
               (now())::date,
               '1 day'::interval
             ) AS day_series
        LEFT JOIN (
          SELECT date_trunc('day', created_at)::date AS d, count(*) AS c
          FROM auth.users
          WHERE created_at >= start_ts
          GROUP BY 1
        ) u ON u.d = day_series::date
        LEFT JOIN (
          SELECT date_trunc('day', added_at)::date AS d, count(*) AS c
          FROM public.comic_books
          WHERE added_at >= start_ts
          GROUP BY 1
        ) b ON b.d = day_series::date
        LEFT JOIN (
          SELECT date_trunc('day', created_at)::date AS d, count(*) AS c
          FROM public.reading_groups
          WHERE created_at >= start_ts
          GROUP BY 1
        ) g ON g.d = day_series::date
        LEFT JOIN (
          SELECT date_trunc('day', read_at)::date AS d, count(*) AS c
          FROM public.comic_books
          WHERE read_at >= start_ts
          GROUP BY 1
        ) r ON r.d = day_series::date
      ) d
    ),

    -- ---------- top users (by # books) ----------
    'top_users', (
      SELECT json_agg(row_to_json(t) ORDER BY t.book_count DESC) FROM (
        SELECT
          u.id,
          coalesce(u.raw_user_meta_data->>'first_name', u.email) AS display_name,
          u.email,
          count(b.*) AS book_count,
          count(*) FILTER (WHERE b.is_read) AS read_count
        FROM auth.users u
        LEFT JOIN public.comic_books b ON b.user_id = u.id
        GROUP BY u.id, u.email, u.raw_user_meta_data
        ORDER BY book_count DESC
        LIMIT 10
      ) t
    ),

    -- ---------- top groups (by # members) ----------
    'top_groups', (
      SELECT json_agg(row_to_json(t) ORDER BY t.member_count DESC) FROM (
        SELECT
          rg.id,
          rg.name,
          rg.emoji,
          rg.created_at,
          count(gm.*) AS member_count,
          (SELECT count(*) FROM public.group_books gb WHERE gb.group_id = rg.id) AS book_count
        FROM public.reading_groups rg
        LEFT JOIN public.group_members gm ON gm.group_id = rg.id
        GROUP BY rg.id
        ORDER BY member_count DESC
        LIMIT 10
      ) t
    ),

    -- ---------- top books (by # users who added the same ISBN) ----------
    'top_books', (
      SELECT json_agg(row_to_json(t) ORDER BY t.add_count DESC) FROM (
        SELECT
          isbn,
          max(title)     AS title,
          max(cover_url) AS cover_url,
          count(*)       AS add_count,
          count(*) FILTER (WHERE is_read) AS read_count
        FROM public.comic_books
        GROUP BY isbn
        ORDER BY add_count DESC
        LIMIT 10
      ) t
    ),

    -- ---------- engagement (% of users meeting each criterion) ----------
    'engagement', json_build_object(
      'total_users', total_users,
      'with_book', (
        SELECT count(DISTINCT user_id) FROM public.comic_books
      ),
      'with_group', (
        SELECT count(DISTINCT user_id) FROM public.group_members
      ),
      'with_read_book', (
        SELECT count(DISTINCT user_id) FROM public.comic_books WHERE is_read = true
      )
    ),

    -- ---------- waitlist conversion (waitlist email → signup email) ----------
    'waitlist', json_build_object(
      'total', (SELECT count(*) FROM public.waitlist),
      'converted', (
        SELECT count(*)
        FROM public.waitlist w
        WHERE EXISTS (
          SELECT 1 FROM auth.users u WHERE lower(u.email) = lower(w.email)
        )
      )
    ),

    'generated_at', now()
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_dashboard_metrics(text, int) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_metrics(text, int) TO anon, authenticated;


-- ============================================================
-- ONE-TIME PASSWORD SETUP
-- ------------------------------------------------------------
-- Run the snippet below ONCE in the SQL Editor with your chosen
-- password substituted for 'CHANGE_ME'. Use a strong one — this
-- is the only thing standing between the public internet and
-- your user data.
--
-- To rotate the password later, run the same snippet again with
-- the new password.
-- ============================================================
/*
INSERT INTO public.admin_credentials (id, password_hash)
VALUES (1, crypt('CHANGE_ME', gen_salt('bf', 10)))
ON CONFLICT (id) DO UPDATE
  SET password_hash = excluded.password_hash,
      updated_at    = now();
*/
