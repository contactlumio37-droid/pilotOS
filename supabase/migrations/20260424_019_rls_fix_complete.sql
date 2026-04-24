-- Migration 019 : Fix RLS complet + politiques idempotentes
-- Corrige : 403 INSERT organisations, 406 profiles, 400 relational queries
-- Utilise DROP POLICY IF EXISTS pour être ré-applicable sans erreur

-- ============================================================
-- ORGANISATIONS
-- ============================================================

-- INSERT : tout utilisateur authentifié peut créer une organisation (onboarding)
DROP POLICY IF EXISTS "organisations_authenticated_insert" ON organisations;
CREATE POLICY "organisations_authenticated_insert" ON organisations
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- SELECT : via appartenance OU superadmin (déjà dans 011, on le recrée proprement)
DROP POLICY IF EXISTS "organisations_member_read" ON organisations;
CREATE POLICY "organisations_member_read" ON organisations
  FOR SELECT TO authenticated
  USING (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM organisation_members
      WHERE organisation_id = organisations.id
        AND user_id = auth.uid()
        AND is_active = true
    )
  );

-- UPDATE : admin de l'org ou superadmin
DROP POLICY IF EXISTS "organisations_admin_update" ON organisations;
CREATE POLICY "organisations_admin_update" ON organisations
  FOR UPDATE TO authenticated
  USING (
    is_superadmin()
    OR get_user_role(id) IN ('admin')
  );

-- ============================================================
-- ORGANISATION_MEMBERS
-- ============================================================

-- SELECT : propre ligne OU superadmin
DROP POLICY IF EXISTS "members_own_read" ON organisation_members;
CREATE POLICY "members_own_read" ON organisation_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_superadmin());

-- SELECT : managers voient les membres de leur org
DROP POLICY IF EXISTS "members_org_manager_read" ON organisation_members;
CREATE POLICY "members_org_manager_read" ON organisation_members
  FOR SELECT TO authenticated
  USING (is_manager_or_above(organisation_id));

-- INSERT : premier membre peut s'insérer comme admin (onboarding)
DROP POLICY IF EXISTS "members_self_insert_first_admin" ON organisation_members;
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

-- ALL : admin/superadmin gèrent les membres
DROP POLICY IF EXISTS "members_admin_write" ON organisation_members;
CREATE POLICY "members_admin_write" ON organisation_members
  FOR ALL TO authenticated
  USING (
    is_superadmin()
    OR get_user_role(organisation_id) IN ('admin')
  );

-- ============================================================
-- PROFILES
-- ============================================================

-- Lire/modifier son propre profil
DROP POLICY IF EXISTS "profiles_own_read_update" ON profiles;
CREATE POLICY "profiles_own_read_update" ON profiles
  FOR ALL TO authenticated
  USING (id = auth.uid());

-- Membres d'une même org peuvent lire les profils de leurs collègues
DROP POLICY IF EXISTS "profiles_org_member_read" ON profiles;
CREATE POLICY "profiles_org_member_read" ON profiles
  FOR SELECT TO authenticated
  USING (
    is_superadmin()
    OR EXISTS (
      SELECT 1
      FROM organisation_members om1
      JOIN organisation_members om2
        ON om1.organisation_id = om2.organisation_id
      WHERE om1.user_id = auth.uid()
        AND om2.user_id = profiles.id
        AND om1.is_active = true
    )
  );

-- ============================================================
-- IMPERSONATION LOGS (superadmin uniquement)
-- ============================================================
DROP POLICY IF EXISTS "impersonation_logs_superadmin" ON impersonation_logs;
CREATE POLICY "impersonation_logs_superadmin" ON impersonation_logs
  FOR ALL TO authenticated
  USING (is_superadmin());
