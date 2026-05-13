-- ============================================================
-- Hotfix: users can SELECT campaigns they're a recipient of
-- ------------------------------------------------------------
-- The mobile EngagementBanner does an INNER JOIN from
-- engagement_recipients (which has a "read own rows" policy) to
-- engagement_campaigns (which had RLS enabled but ZERO policies →
-- effectively invisible to authenticated clients). Result: the
-- JOIN returned nothing, banner never showed.
--
-- Fix: scoped SELECT policy. A user can read a campaign IFF they
-- have a recipient row for it. Admin can still read everything via
-- the security-definer admin_list_campaigns RPC (unchanged).
--
-- Idempotent — DROP/CREATE pattern.
-- ============================================================

DROP POLICY IF EXISTS "users read campaigns they receive" ON public.engagement_campaigns;
CREATE POLICY "users read campaigns they receive"
  ON public.engagement_campaigns
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.engagement_recipients r
      WHERE r.campaign_id = engagement_campaigns.id
        AND r.user_id = auth.uid()
    )
  );
