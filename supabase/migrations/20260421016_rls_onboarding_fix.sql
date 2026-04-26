-- Migration 016 : Fix RLS onboarding
-- Problème : aucune politique INSERT sur organisations
--            + organisation_members exige d'être déjà admin (impossible au 1er membre)

-- ── organisations ──────────────────────────────────────────
-- Tout utilisateur authentifié peut créer une organisation (flow onboarding)
CREATE POLICY "organisations_authenticated_insert" ON organisations
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ── organisation_members ───────────────────────────────────
-- Autoriser l'insertion de soi-même comme premier admin d'une org sans membres existants
CREATE POLICY "members_self_insert_first_admin" ON organisation_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'admin'
    AND NOT EXISTS (
      SELECT 1 FROM organisation_members existing
      WHERE existing.organisation_id = organisation_members.organisation_id
    )
  );
