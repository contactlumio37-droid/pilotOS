-- =============================================================
-- PilotOS v0.5.1 — Fix RLS organisation_members
-- Tout membre actif peut voir les autres membres de son org
-- Corrige : liste membres vide, RACI vide, dashboard 0 membres
-- Migration idempotente — safe si rejouée
-- =============================================================

DROP POLICY IF EXISTS "members_org_member_read" ON organisation_members;

CREATE POLICY "members_org_member_read" ON organisation_members
  FOR SELECT USING (
    -- Superadmin voit tous les membres de toutes les orgs
    is_superadmin()
    OR
    -- Tout membre actif voit les autres membres de la MÊME org
    -- Isolation inter-organisations préservée
    EXISTS (
      SELECT 1 FROM organisation_members me
      WHERE me.user_id      = auth.uid()
        AND me.organisation_id = organisation_members.organisation_id
        AND me.is_active    = true
    )
  );
