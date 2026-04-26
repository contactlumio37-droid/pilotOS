-- PilotOS — Migration 006 : Clés étrangères circulaires
-- Ajout après création des tables dépendantes

-- terrain_reports.action_id → actions (créé après actions pour éviter la circularité)
ALTER TABLE terrain_reports
  ADD COLUMN action_id UUID REFERENCES actions(id);

-- Index
CREATE INDEX terrain_reports_organisation_id_idx ON terrain_reports(organisation_id);
CREATE INDEX terrain_reports_reported_by_idx ON terrain_reports(reported_by);
CREATE INDEX terrain_reports_status_idx ON terrain_reports(status);
