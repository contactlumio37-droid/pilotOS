-- =============================================================
-- PilotOS — Migration 20260506005
-- Fix RLS organisation_members : tout membre actif peut voir
-- les autres membres de son organisation.
--
-- PROBLÈME DIAGNOSTIQUÉ :
-- Les policies existantes ne couvrent que :
--   1. members_own_read    → user_id = auth.uid() (sa propre ligne seulement)
--   2. members_org_manager_read → is_manager_or_above() (manager/admin/director)
--
-- Un contributor/terrain/reader ne satisfait aucune policy pour
-- voir les AUTRES membres → la query retourne [] → RACI vide.
--
-- FIX : ajouter is_org_member() SECURITY DEFINER + policy élargie.
-- SECURITY DEFINER est obligatoire pour éviter la récursion infinie
-- dans une policy self-référentielle sur organisation_members.
-- =============================================================

-- ── Fonction SECURITY DEFINER ─────────────────────────────────
-- Vérifie si l'utilisateur courant est membre actif d'une org.
-- SECURITY DEFINER bypass RLS → évite la récursion dans la policy.
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organisation_members
    WHERE user_id         = auth.uid()
      AND organisation_id = org_id
      AND is_active       = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── Remplacement de la policy manager-only ────────────────────
-- Avant : seuls manager/admin/director/superadmin voyaient les membres
-- Après : tout membre actif de l'org voit les autres membres actifs
DROP POLICY IF EXISTS "members_org_manager_read" ON organisation_members;
DROP POLICY IF EXISTS "members_org_member_read"  ON organisation_members;

CREATE POLICY "members_org_member_read" ON organisation_members
  FOR SELECT USING (
    is_superadmin()
    OR is_org_member(organisation_id)
  );

-- Note : members_own_read (user_id = auth.uid()) est conservée —
-- elle couvre le cas onboarding/compte orphelin (pas encore dans une org).

-- ── Vérification post-migration ───────────────────────────────
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'organisation_members'
-- ORDER BY policyname;
-- → doit afficher members_own_read + members_org_member_read + members_admin_write
