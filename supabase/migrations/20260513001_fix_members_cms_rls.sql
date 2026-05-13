-- =============================================================
-- PilotOS — Migration 20260513001 : Fix RLS membres, CMS, profiles
-- =============================================================
-- PROBLÈMES :
-- 1. profiles_org_member_read : un superadmin en impersonation ne partage
--    pas de membership actif avec les membres de l'org impersonifiée
--    → users_share_org() retourne false → JOIN full_name/avatar_url échoue
--    → RACI et drawers membres affichent 0 résultat
--
-- 2. cms_pages_superadmin : la policy utilise is_superadmin() qui est
--    correcte, mais profiles_org_member_read bloquant le superadmin
--    provoque des erreurs en cascade dans CmsTab
--
-- FIX : ajouter is_superadmin() comme bypass dans profiles_org_member_read
--       + renforcer members_org_member_read pour cohérence
-- =============================================================

-- ── 1. profiles_org_member_read — bypass superadmin ──────────
-- Permet au superadmin en impersonation de lire les profils (full_name,
-- avatar_url) des membres des orgs qu'il consulte.
DROP POLICY IF EXISTS "profiles_org_member_read" ON profiles;
CREATE POLICY "profiles_org_member_read" ON profiles
  FOR SELECT USING (
    is_superadmin()
    OR id = auth.uid()
    OR users_share_org(id)
  );

-- ── 2. members_org_member_read — redondance superadmin ───────
-- Cohérence : s'assurer que le superadmin voit bien tous les membres,
-- même si is_superadmin() est déjà dans la version précédente.
DROP POLICY IF EXISTS "members_org_member_read" ON organisation_members;
CREATE POLICY "members_org_member_read" ON organisation_members
  FOR SELECT USING (
    is_superadmin()
    OR user_is_in_org(organisation_id)
  );

-- ── 3. cms_pages — s'assurer que la policy superadmin est robuste ──
-- La policy existante est correcte mais on la recrée pour cohérence
-- et pour forcer l'utilisation de la lecture directe profiles.is_superadmin
-- (plus robuste que le fallback membership de is_superadmin()).
DROP POLICY IF EXISTS "cms_pages_superadmin" ON cms_pages;
CREATE POLICY "cms_pages_superadmin" ON cms_pages
  FOR ALL USING (
    (SELECT is_superadmin FROM profiles WHERE id = auth.uid())
    OR is_superadmin()
  ) WITH CHECK (
    (SELECT is_superadmin FROM profiles WHERE id = auth.uid())
    OR is_superadmin()
  );
