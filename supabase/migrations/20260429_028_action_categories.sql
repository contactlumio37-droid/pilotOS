-- PilotOS — Migration 028 : Catégories d'actions dynamiques
-- Ajoute la table action_categories et la colonne category_id sur actions.
-- La colonne origin existante est conservée (aucune donnée supprimée).

-- ============================================================
-- Table action_categories
-- ============================================================
CREATE TABLE IF NOT EXISTS action_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  color           TEXT NOT NULL DEFAULT '#6b7280',
  icon            TEXT NOT NULL DEFAULT 'tag',
  is_default      BOOLEAN NOT NULL DEFAULT false,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organisation_id, name)
);

ALTER TABLE action_categories ENABLE ROW LEVEL SECURITY;

-- ── RLS ──────────────────────────────────────────────────────

CREATE POLICY "action_categories_read" ON action_categories
  FOR SELECT USING (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.organisation_id = action_categories.organisation_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

CREATE POLICY "action_categories_write" ON action_categories
  FOR ALL USING (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.organisation_id = action_categories.organisation_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'superadmin')
        AND om.is_active = true
    )
  );

-- ── Colonne category_id sur actions ──────────────────────────
-- ON DELETE SET NULL : la suppression d'une catégorie ne supprime pas les actions.
ALTER TABLE actions
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES action_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS actions_category_id_idx ON actions(category_id);

-- ── Données initiales par organisation (fonction + trigger) ──
-- Insère les catégories par défaut lors de la création d'une organisation.
-- Séparées en fonction pour pouvoir être appelées manuellement aussi.

CREATE OR REPLACE FUNCTION seed_action_categories(p_organisation_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO action_categories (organisation_id, name, color, icon, is_default, sort_order)
  VALUES
    (p_organisation_id, 'CODIR',                  '#7c3aed', 'landmark',        true, 1),
    (p_organisation_id, 'Projet',                 '#0ea5e9', 'folder',           true, 2),
    (p_organisation_id, 'Amélioration processus', '#10b981', 'refresh-cw',       true, 3),
    (p_organisation_id, 'Audit',                  '#f59e0b', 'clipboard-check',  true, 4),
    (p_organisation_id, 'Incident',               '#ef4444', 'alert-triangle',   true, 5)
  ON CONFLICT (organisation_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur organisations pour seeder les catégories à la création
CREATE OR REPLACE FUNCTION trigger_seed_action_categories()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM seed_action_categories(NEW.id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW; -- ne jamais bloquer la création d'organisation
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS organisations_seed_action_categories ON organisations;
CREATE TRIGGER organisations_seed_action_categories
  AFTER INSERT ON organisations
  FOR EACH ROW EXECUTE FUNCTION trigger_seed_action_categories();

-- Seed les organisations existantes (idempotent via ON CONFLICT DO NOTHING)
DO $$
DECLARE
  org RECORD;
BEGIN
  FOR org IN SELECT id FROM organisations LOOP
    PERFORM seed_action_categories(org.id);
  END LOOP;
END;
$$;
