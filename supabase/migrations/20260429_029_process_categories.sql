-- PilotOS — Migration 029 : Catégories de processus + colonne category_id sur processes
-- La table action_categories et sa colonne sur actions existent déjà (migration 028).

-- ============================================================
-- Table process_categories
-- ============================================================
CREATE TABLE IF NOT EXISTS process_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  color           TEXT NOT NULL DEFAULT '#6b7280',
  icon            TEXT NOT NULL DEFAULT 'layers',
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organisation_id, name)
);

ALTER TABLE process_categories ENABLE ROW LEVEL SECURITY;

-- ── RLS ──────────────────────────────────────────────────────

CREATE POLICY "process_categories_read" ON process_categories
  FOR SELECT USING (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.organisation_id = process_categories.organisation_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

CREATE POLICY "process_categories_write" ON process_categories
  FOR ALL USING (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.organisation_id = process_categories.organisation_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'superadmin')
        AND om.is_active = true
    )
  );

-- ── Colonne category_id sur processes ─────────────────────────
ALTER TABLE processes
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES process_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS processes_category_id_idx ON processes(category_id);

-- ── Données initiales par organisation ────────────────────────

CREATE OR REPLACE FUNCTION seed_process_categories(p_organisation_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO process_categories (organisation_id, name, color, icon, sort_order)
  VALUES
    (p_organisation_id, 'Management',            '#7c3aed', 'compass',   0),
    (p_organisation_id, 'Opérationnel',           '#0ea5e9', 'cog',       1),
    (p_organisation_id, 'Support',                '#10b981', 'life-buoy', 2),
    (p_organisation_id, 'Qualité / Amélioration', '#f59e0b', 'award',     3)
  ON CONFLICT (organisation_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_seed_process_categories()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM seed_process_categories(NEW.id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS organisations_seed_process_categories ON organisations;
CREATE TRIGGER organisations_seed_process_categories
  AFTER INSERT ON organisations
  FOR EACH ROW EXECUTE FUNCTION trigger_seed_process_categories();

-- Seed les organisations existantes (idempotent)
DO $$
DECLARE
  org RECORD;
BEGIN
  FOR org IN SELECT id FROM organisations LOOP
    PERFORM seed_process_categories(org.id);
  END LOOP;
END;
$$;
