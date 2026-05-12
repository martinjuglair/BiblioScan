-- ============================================================
-- Admin dashboard RPCs
-- ------------------------------------------------------------
-- One single RPC `admin_dashboard_metrics(period_days int)` that
-- returns everything the dashboard needs as one JSON blob:
--   - totals (lifetime counts)
--   - period stats (last N days)
--   - daily series for the period (one row per day, no gaps)
--   - top users, top groups, top books
--   - engagement % (users with ≥1 book, ≥1 group, ≥1 read book)
--   - waitlist conversion
--
-- Locked down with `security definer` + an admin-email guard so
-- only the configured admin can call it. Anyone else gets a
-- raised exception (no data leak).
--
-- To allow another admin in the future, just add their email to
-- the `is_dashboard_admin()` helper below.
-- ============================================================

-- ---------- 1. Admin guard helper ----------
CREATE OR REPLACE FUNCTION public.is_dashboard_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND lower(email) IN (
        'martinjuglair@gmail.com'
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_dashboard_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_dashboard_admin() TO authenticated;


-- ---------- 2. Main metrics RPC ----------
CREATE OR REPLACE FUNCTION public.admin_dashboard_metrics(period_days int DEFAULT 30)
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
  -- Admin guard
  IF NOT public.is_dashboard_admin() THEN
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

REVOKE ALL ON FUNCTION public.admin_dashboard_metrics(int) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_metrics(int) TO authenticated;
