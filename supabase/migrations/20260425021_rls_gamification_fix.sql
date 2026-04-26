-- Migration 021 : Fix RLS gamification — user_badges manquait de politique d'écriture
-- Sans cette politique, les INSERT dans user_badges échouaient silencieusement
-- car RLS était activé mais seul un SELECT policy existait.

-- ============================================================
-- user_badges — politique d'écriture (INSERT)
-- ============================================================
-- Un utilisateur authentifié peut insérer ses propres badges.
-- Les admins/superadmin peuvent en attribuer à n'importe qui dans leur org.
DROP POLICY IF EXISTS "badges_own_insert" ON user_badges;
CREATE POLICY "badges_own_insert" ON user_badges
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR is_superadmin()
    OR is_manager_or_above(organisation_id)
  );

-- ============================================================
-- user_streaks — s'assurer que la politique ALL couvre bien l'upsert
-- (déjà en place via migration 011, on la recrée proprement)
-- ============================================================
DROP POLICY IF EXISTS "streaks_own" ON user_streaks;
CREATE POLICY "streaks_own" ON user_streaks
  FOR ALL TO authenticated
  USING  (user_id = auth.uid() OR is_superadmin())
  WITH CHECK (user_id = auth.uid() OR is_superadmin());
