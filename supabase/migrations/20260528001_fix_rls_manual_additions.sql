-- =============================================================
-- PilotOS — Migration 20260528001 : Fix RLS ajouts manuels
-- Corrige 4 bugs bloquants identifiés lors de l'audit RLS :
--
--   [BUG-1] module_access   — write bloqué pour les admins d'organisation
--           RegisterPage.tsx:151 + OnboardingPage.tsx:545 échouent silencieusement
--           → modules jamais activés, app vide pour les nouvelles orgs
--
--   [BUG-2] organisation_members — bootstrap INSERT impossible
--           RegisterPage.tsx:141 : get_user_role() retourne NULL avant la
--           première adhésion → l'utilisateur ne peut pas rejoindre son org
--
--   [BUG-3] admin_audit_log — INSERT trop restreint (régression 20260517007)
--           logEvent() dans stripe.service.ts est appelé par tout utilisateur
--           lors d'une action de paiement → logs Stripe perdus silencieusement
--
--   [BUG-4] bounty_pledges — aucune policy INSERT
--           Aucun utilisateur authentifié ne peut déposer un pledge
--
-- Idempotente — safe si rejouée (DROP IF EXISTS + CREATE)
-- =============================================================


-- =============================================================
-- [BUG-1] module_access : autoriser les admins d'organisation
-- =============================================================
-- AVANT : FOR ALL USING (is_superadmin()) — bloque tout non-superadmin
-- APRÈS : admin de l'org peut gérer les modules de son organisation

DROP POLICY IF EXISTS "module_access_superadmin_write" ON module_access;
DROP POLICY IF EXISTS "module_access_admin_write"      ON module_access;

CREATE POLICY "module_access_admin_write" ON module_access
  FOR ALL
  USING (
    is_superadmin()
    OR get_user_role(organisation_id) IN ('admin')
  )
  WITH CHECK (
    is_superadmin()
    OR get_user_role(organisation_id) IN ('admin')
  );


-- =============================================================
-- [BUG-2] organisation_members : bootstrap INSERT (création d'org)
-- =============================================================
-- PROBLÈME : members_admin_write FOR ALL USING (get_user_role(...) IN ('admin'))
-- → get_user_role() retourne NULL avant la première adhésion → INSERT bloqué.
--
-- FIX : nouvelle policy INSERT dédiée au cas bootstrap.
-- SECURITY DEFINER obligatoire pour éviter la récursion infinie :
-- une policy sur organisation_members ne peut pas faire de subquery
-- sur organisation_members sans SECURITY DEFINER.

CREATE OR REPLACE FUNCTION org_has_no_active_members(target_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM organisation_members
    WHERE organisation_id = target_org_id
      AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

DROP POLICY IF EXISTS "members_self_first_admin_insert" ON organisation_members;

CREATE POLICY "members_self_first_admin_insert" ON organisation_members
  FOR INSERT WITH CHECK (
    -- L'utilisateur insère sa propre ligne en tant qu'admin
    -- uniquement si l'org n'a encore aucun membre actif (création).
    user_id = auth.uid()
    AND role = 'admin'
    AND org_has_no_active_members(organisation_id)
  );


-- =============================================================
-- [BUG-3] admin_audit_log : restaurer INSERT pour utilisateurs authentifiés
-- =============================================================
-- RÉGRESSION : 20260517007 a supprimé audit_log_authenticated_insert
-- et restreint INSERT au superadmin uniquement.
-- IMPACT : logEvent() dans stripe.service.ts échoue pour tout non-superadmin.
--
-- FIX : deux policies séparées —
--   • superadmin : INSERT libre (impersonation légitime, actor_id flexible)
--   • utilisateur authentifié : INSERT avec actor_id = auth.uid() (anti-usurpation)

DROP POLICY IF EXISTS "audit_log_superadmin_insert"    ON admin_audit_log;
DROP POLICY IF EXISTS "audit_log_authenticated_insert" ON admin_audit_log;

-- Superadmin peut insérer sans restriction d'actor_id
CREATE POLICY "audit_log_superadmin_insert" ON admin_audit_log
  FOR INSERT WITH CHECK (is_superadmin());

-- Tout utilisateur authentifié peut insérer ses propres événements
-- WITH CHECK garantit que actor_id correspond à l'appelant → pas d'usurpation
CREATE POLICY "audit_log_authenticated_insert" ON admin_audit_log
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (actor_id IS NULL OR actor_id = auth.uid())
  );


-- =============================================================
-- [BUG-4] bounty_pledges : ajouter policy INSERT
-- =============================================================
-- Pledge organisationnel (organisation_id non null) : admin de l'org
-- Pledge individuel (organisation_id null)          : tout utilisateur authentifié

DROP POLICY IF EXISTS "bounty_pledges_insert" ON bounty_pledges;

CREATE POLICY "bounty_pledges_insert" ON bounty_pledges
  FOR INSERT WITH CHECK (
    is_superadmin()
    OR (organisation_id IS NULL AND auth.uid() IS NOT NULL)
    OR get_user_role(organisation_id) IN ('admin')
  );


-- =============================================================
-- Vérification post-migration (à exécuter en SQL Editor)
-- =============================================================
-- SELECT policyname, tablename, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN (
--   'module_access', 'organisation_members',
--   'admin_audit_log', 'bounty_pledges'
-- )
-- ORDER BY tablename, cmd;
--
-- module_access      → doit avoir module_access_member_read (SELECT)
--                       + module_access_admin_write (ALL)
-- organisation_members → doit avoir members_own_read, members_org_member_read,
--                         members_admin_write, members_self_first_admin_insert
-- admin_audit_log    → doit avoir audit_log_superadmin_read (SELECT)
--                       + audit_log_superadmin_insert (INSERT)
--                       + audit_log_authenticated_insert (INSERT)
-- bounty_pledges     → doit avoir bounty_pledges_own_read (SELECT)
--                       + bounty_pledges_insert (INSERT)
