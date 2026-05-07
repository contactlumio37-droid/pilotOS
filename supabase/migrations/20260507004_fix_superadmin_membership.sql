-- =============================================================
-- PilotOS — Migration 20260507002 : Fix is_superadmin() + BUG-001
-- =============================================================
-- CAUSE RACINE : is_superadmin() vérifie organisation_members WHERE role='superadmin'
-- mais OnboardingPage insère role='admin' — le compte superadmin n'a jamais role='superadmin'.
-- Résultat : toutes les RLS policies appelant is_superadmin() retournent false → 0 données.
--
-- FIX : ajouter profiles.is_superadmin comme source de vérité primaire,
-- indépendante de organisation_members et de son rôle.
--
-- ⚠️  ACTION MANUELLE REQUISE une seule fois après déploiement :
--     Promouvoir le compte superadmin existant :
--
--     UPDATE profiles SET is_superadmin = true
--       WHERE id = '<UUID_DU_SUPERADMIN>';
--
--     UPDATE organisation_members SET role = 'superadmin', is_active = true
--       WHERE user_id = '<UUID_DU_SUPERADMIN>';
--
--     Récupérer l'UUID : Supabase Dashboard → Authentication → Users → email superadmin
-- =============================================================

-- ── 1. Colonne profiles.is_superadmin ────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN NOT NULL DEFAULT false;

-- ── 2. is_superadmin() : source primaire = profiles, fallback = membership ──
-- SECURITY DEFINER : lit profiles sans être bloqué par RLS
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
  SELECT
    COALESCE(
      (SELECT is_superadmin FROM profiles WHERE id = auth.uid()),
      false
    )
    OR EXISTS (
      SELECT 1 FROM organisation_members
      WHERE user_id    = auth.uid()
        AND role       = 'superadmin'
        AND is_active  = true
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── 3. members_own_read : garantir qu'un superadmin peut toujours
--       lire ses propres lignes même avec membership inactif ────
DROP POLICY IF EXISTS "members_own_read" ON organisation_members;
CREATE POLICY "members_own_read" ON organisation_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR is_superadmin()
  );
