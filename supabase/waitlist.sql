-- =====================================================================
-- Pre-launch waitlist — captures emails from the LP while the apps are
-- still "Bientôt disponible" on the stores.
--
-- Public INSERT-only RLS so anyone can subscribe without auth. SELECT
-- is restricted to service_role (read it from the Supabase dashboard).
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.waitlist (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  source      text DEFAULT 'lp_hero',
  user_agent  text,
  signed_up_at timestamptz DEFAULT now()
);

-- One row per email — silently ignore re-submits (idempotent UPSERT).
CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_email_lower
  ON public.waitlist (lower(email));

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone (anon) can sign up.
DROP POLICY IF EXISTS "anon_can_insert_waitlist" ON public.waitlist;
CREATE POLICY "anon_can_insert_waitlist"
  ON public.waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- No one can read the table from the client (only service_role bypasses RLS).
-- Owner reads the list from the Supabase dashboard / psql.
DROP POLICY IF EXISTS "no_select_for_clients" ON public.waitlist;
-- Intentionally omitted: no SELECT policy means only service_role can read.
