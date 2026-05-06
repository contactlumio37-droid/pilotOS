-- =============================================================
-- PilotOS — Migration 20260506001 : Fix RLS membres + modules
-- Sprint 1 — v0.5.0
-- =============================================================

-- 1. Corriger profiles_org_member_read
--    Ajoute om2.is_active = true pour exclure les membres désactivés
--    et éviter les lignes fantômes dues au JOIN croisé multi-org

DROP POLICY IF EXISTS "profiles_org_member_read" ON profiles;
CREATE POLICY "profiles_org_member_read" ON profiles
  FOR SELECT USING (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM organisation_members om1
      JOIN organisation_members om2
        ON om1.organisation_id = om2.organisation_id
      WHERE om1.user_id = auth.uid()
        AND om2.user_id = profiles.id
        AND om1.is_active = true
        AND om2.is_active = true   -- FIX : filtre membres désactivés
    )
  );

-- 2. Seed tous les modules pour les orgs existantes
--    (RegisterPage ne créait que 'pilotage' → les autres modules manquaient)

INSERT INTO module_access (organisation_id, module, is_active)
SELECT
  o.id,
  m.module,
  true
FROM organisations o
CROSS JOIN (
  VALUES
    ('pilotage'),
    ('processus'),
    ('ged'),
    ('terrain'),
    ('securite')
) AS m(module)
WHERE NOT EXISTS (
  SELECT 1 FROM module_access ma
  WHERE ma.organisation_id = o.id
    AND ma.module = m.module
)
ON CONFLICT DO NOTHING;
