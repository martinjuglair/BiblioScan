-- ============================================================
-- Admin dashboard RPCs — Google-OAuth-gated
-- ------------------------------------------------------------
-- The dashboard now relies on Supabase Auth (Google provider) for
-- authentication. The single admin email is hard-coded in the
-- `verify_admin()` function installed by `admin-google-auth.sql`,
-- which reads `auth.jwt() ->> 'email'` server-side — so a tampered
-- client cannot bypass the gate.
--
-- Run order on a fresh DB (or after the bcrypt→Google migration):
--   1. admin-google-auth.sql  (creates verify_admin, drops legacy)
--   2. this file              (recreates admin_dashboard_metrics)
--   3. admin-recent-users.sql (recreates admin_recent_users)
--   4. engagement-admin-rpcs.sql (recreates 8 engagement RPCs)
--
-- Idempotent — safe to re-run.
-- ============================================================


-- ---------- Main metrics RPC (Google-auth-gated) ----------
-- Drop any prior overload so the new signature is unambiguous.
DROP FUNCTION IF EXISTS public.admin_dashboard_metrics(text, int);
DROP FUNCTION IF EXISTS public.admin_dashboard_metrics(text, int, timestamptz);
DROP FUNCTION IF EXISTS public.admin_dashboard_metrics(int, timestamptz);

CREATE OR REPLACE FUNCTION public.admin_dashboard_metrics(
  period_days  int         DEFAULT 30,
  since_date   timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  result json;
  start_ts timestamptz;
  total_users int;
BEGIN
  -- Admin guard (Google-OAuth email check, see admin-google-auth.sql)
  IF NOT public.verify_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  -- Clamp the period to something sensible
  IF period_days IS NULL OR period_days <= 0 THEN
    period_days := 30;
  END IF;
  IF period_days > 365 THEN
    period_days := 365;
  END IF;

  start_ts := date_trunc('day', now()) - ((period_days - 1) || ' days')::interval;

  -- If the caller passed a "since" floor (e.g. App-Store launch date),
  -- clip the period to it. This lets the dashboard ignore pre-launch
  -- noise without having to recompute period_days client-side.
  IF since_date IS NOT NULL AND since_date > start_ts THEN
    start_ts := date_trunc('day', since_date);
  END IF;

  SELECT count(*) INTO total_users
  FROM auth.users
  WHERE since_date IS NULL OR created_at >= since_date;

  SELECT json_build_object(
    -- ---------- totals (lifetime OR since launch if since_date set) ----------
    'totals', json_build_object(
      'users',  total_users,
      'books',  (
        SELECT count(*) FROM public.comic_books
        WHERE since_date IS NULL OR added_at >= since_date
      ),
      'groups', (
        SELECT count(*) FROM public.reading_groups
        WHERE since_date IS NULL OR created_at >= since_date
      ),
      'reads', (
        SELECT count(*) FROM public.comic_books
        WHERE is_read = true
          AND (since_date IS NULL OR read_at >= since_date)
      ),
      'group_members', (
        SELECT count(*) FROM public.group_members
        WHERE since_date IS NULL OR joined_at >= since_date
      )
    ),

    -- ---------- period stats (last N days, also clipped to since_date) ----------
    'period', json_build_object(
      'days', period_days,
      'start', start_ts,
      'new_users',  (SELECT count(*) FROM auth.users          WHERE created_at  >= start_ts),
      'new_books',  (SELECT count(*) FROM public.comic_books  WHERE added_at    >= start_ts),
      'new_groups', (SELECT count(*) FROM public.reading_groups WHERE created_at >= start_ts),
      'new_reads',  (SELECT count(*) FROM public.comic_books  WHERE read_at     >= start_ts)
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
        WHERE since_date IS NULL OR u.created_at >= since_date
        GROUP BY u.id, u.email, u.raw_user_meta_data
        ORDER BY book_count DESC
        LIMIT 10
      ) t
    ),

    -- ---------- top groups (by # members) — with full member list ----------
    'top_groups', (
      SELECT json_agg(row_to_json(t) ORDER BY t.member_count DESC) FROM (
        SELECT
          rg.id,
          rg.name,
          rg.emoji,
          rg.created_at,
          coalesce(u.email, '—') AS created_by_email,
          coalesce(u.raw_user_meta_data->>'first_name', u.email, '—') AS created_by_name,
          (SELECT count(*) FROM public.group_members gm WHERE gm.group_id = rg.id) AS member_count,
          (SELECT count(*) FROM public.group_books gb WHERE gb.group_id = rg.id) AS book_count,
          (
            SELECT json_agg(row_to_json(m) ORDER BY m.joined_at) FROM (
              SELECT
                gm.user_id           AS id,
                coalesce(gm.first_name, mu.raw_user_meta_data->>'first_name', mu.email) AS name,
                mu.email,
                gm.role,
                gm.joined_at
              FROM public.group_members gm
              LEFT JOIN auth.users mu ON mu.id = gm.user_id
              WHERE gm.group_id = rg.id
            ) m
          ) AS members
        FROM public.reading_groups rg
        LEFT JOIN auth.users u ON u.id = rg.created_by
        WHERE since_date IS NULL OR rg.created_at >= since_date
        ORDER BY member_count DESC
        LIMIT 10
      ) t
    ),

    -- ---------- top books (by # users who added the same ISBN) ----------
    -- Mirrors the top_groups pattern: each row carries the full owners
    -- list as a JSON array so the dashboard can render an expandable
    -- "who owns this book" panel without a second round-trip.
    'top_books', (
      SELECT json_agg(row_to_json(t) ORDER BY t.add_count DESC) FROM (
        SELECT
          b.isbn,
          max(b.title)     AS title,
          max(b.cover_url) AS cover_url,
          count(*)         AS add_count,
          count(*) FILTER (WHERE b.is_read) AS read_count,
          (
            SELECT json_agg(row_to_json(o) ORDER BY o.added_at DESC) FROM (
              SELECT
                b2.user_id                                         AS id,
                coalesce(u.raw_user_meta_data->>'first_name',
                         u.email)                                  AS name,
                u.email,
                b2.is_read,
                b2.added_at
              FROM public.comic_books b2
              LEFT JOIN auth.users u ON u.id = b2.user_id
              WHERE b2.isbn = b.isbn
                AND (since_date IS NULL OR b2.added_at >= since_date)
            ) o
          ) AS owners
        FROM public.comic_books b
        WHERE since_date IS NULL OR b.added_at >= since_date
        GROUP BY b.isbn
        ORDER BY add_count DESC
        LIMIT 10
      ) t
    ),

    -- ---------- engagement (% of users meeting each criterion) ----------
    'engagement', json_build_object(
      'total_users', total_users,
      'with_book', (
        SELECT count(DISTINCT b.user_id) FROM public.comic_books b
        JOIN auth.users u ON u.id = b.user_id
        WHERE since_date IS NULL OR u.created_at >= since_date
      ),
      'with_group', (
        SELECT count(DISTINCT gm.user_id) FROM public.group_members gm
        JOIN auth.users u ON u.id = gm.user_id
        WHERE since_date IS NULL OR u.created_at >= since_date
      ),
      'with_read_book', (
        SELECT count(DISTINCT b.user_id) FROM public.comic_books b
        JOIN auth.users u ON u.id = b.user_id
        WHERE b.is_read = true
          AND (since_date IS NULL OR u.created_at >= since_date)
      )
    ),

    -- ---------- recent app feedback (Profile → "Votre avis compte") ----------
    'recent_feedback', (
      SELECT json_agg(row_to_json(f) ORDER BY f.created_at DESC) FROM (
        SELECT
          fb.id,
          fb.rating,
          fb.message,
          fb.created_at,
          coalesce(u.raw_user_meta_data->>'first_name', u.email, '—') AS user_name,
          u.email AS user_email
        FROM public.app_feedback fb
        LEFT JOIN auth.users u ON u.id = fb.user_id
        WHERE since_date IS NULL OR fb.created_at >= since_date
        ORDER BY fb.created_at DESC
        LIMIT 30
      ) f
    ),

    'generated_at', now()
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_dashboard_metrics(int, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_metrics(int, timestamptz) TO authenticated;
