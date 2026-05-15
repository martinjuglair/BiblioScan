-- ============================================================
-- Mark user feedback as read (resolve from the dashboard)
-- ------------------------------------------------------------
-- The dashboard's "Avis utilisateurs" card showed every feedback
-- row ever submitted, with no way to dismiss the ones already
-- triaged. As traffic grows the card becomes unreadable.
--
-- Two additions here, both idempotent:
--   1. New nullable column `read_at` on app_feedback.
--      - NULL = not yet processed (default for new rows)
--      - non-NULL = admin marked it as done at that timestamp
--   2. New RPC `admin_mark_feedback_read(uuid)` that flips a row's
--      read_at to now(). Gated by verify_admin() — same Google-
--      OAuth check as the rest of the admin RPCs.
--
-- The `recent_feedback` block of admin_dashboard_metrics is
-- updated in admin-dashboard.sql to filter `read_at IS NULL`, so
-- resolved items disappear from the dashboard the moment the
-- admin clicks the button (and the page is refreshed).
--
-- Run order: after admin-google-auth.sql. Idempotent.
-- ============================================================


-- ---- 1. Add the read_at column -------------------------------------
ALTER TABLE public.app_feedback
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- Partial index so the "unread only" filter is cheap even when
-- the historical table grows. Only indexes NULL rows.
CREATE INDEX IF NOT EXISTS idx_app_feedback_unread
  ON public.app_feedback (created_at DESC)
  WHERE read_at IS NULL;


-- ---- 2. Admin RPC to flip a row to read ----------------------------
DROP FUNCTION IF EXISTS public.admin_mark_feedback_read(uuid);

CREATE OR REPLACE FUNCTION public.admin_mark_feedback_read(p_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.verify_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.app_feedback
  SET read_at = now()
  WHERE id = p_id
    AND read_at IS NULL;

  RETURN json_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_mark_feedback_read(uuid) FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.admin_mark_feedback_read(uuid) TO authenticated;
