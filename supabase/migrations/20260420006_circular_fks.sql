-- PilotOS — Migration 006 : Clés étrangères circulaires
-- Ajout après création des tables dépendantes

-- terrain_reports.action_id → actions (créé après actions pour éviter la circularité)
DO $$
BEGIN
  ALTER TABLE terrain_reports
  ADD COLUMN action_id UUID REFERENCES actions(id);
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- Index
CREATE INDEX IF NOT EXISTS terrain_reports_organisation_id_idx ON terrain_reports(organisation_id);
CREATE INDEX IF NOT EXISTS terrain_reports_reported_by_idx ON terrain_reports(reported_by);
CREATE INDEX IF NOT EXISTS terrain_reports_status_idx ON terrain_reports(status);
