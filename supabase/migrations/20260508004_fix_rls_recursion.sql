-- =============================================================
-- PilotOS — Migration 20260508004 : Correction récursion infinie RLS
-- =============================================================
-- CAUSE : members_org_member_read sur organisation_members contient
-- une subquery sur organisation_members elle-même. Quand une query
-- sur profiles déclenche profiles_org_member_read → organisation_members
-- → members_org_member_read → organisation_members → etc.,
-- PostgreSQL lève "infinite recursion detected in policy" → HTTP 500.
--
-- FIX : wrapper les subqueries self-référentielles dans des fonctions
-- SECURITY DEFINER. SECURITY DEFINER bypasse RLS → pas de récursion.
-- =============================================================

-- ── Helpers SECURITY DEFINER ──────────────────────────────────

-- Vérifie si l'utilisateur courant est membre actif d'une org
-- Sans RLS → ne peut pas déclencher members_org_member_read
CREATE OR REPLACE FUNCTION user_is_in_org(target_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organisation_members
    WHERE user_id        = auth.uid()
      AND organisation_id = target_org_id
      AND is_active       = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Vérifie si l'utilisateur courant partage une org avec un autre utilisateur
-- Sans RLS → ne peut pas déclencher profiles_org_member_read ni members_org_member_read
CREATE OR REPLACE FUNCTION users_share_org(other_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organisation_members om1
    JOIN organisation_members om2 ON om1.organisation_id = om2.organisation_id
    WHERE om1.user_id   = auth.uid()
      AND om2.user_id   = other_user_id
      AND om1.is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── Fix : members_org_member_read ────────────────────────────
-- Remplacement de la subquery self-référentielle par user_is_in_org()

DROP POLICY IF EXISTS "members_org_member_read" ON organisation_members;
CREATE POLICY "members_org_member_read" ON organisation_members
  FOR SELECT USING (
    is_superadmin()
    OR user_is_in_org(organisation_id)
  );

-- ── Fix : profiles_org_member_read ───────────────────────────
-- Remplacement de la double JOIN sur organisation_members par users_share_org()

DROP POLICY IF EXISTS "profiles_org_member_read" ON profiles;
CREATE POLICY "profiles_org_member_read" ON profiles
  FOR SELECT USING (
    users_share_org(id)
  );
