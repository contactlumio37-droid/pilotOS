-- Sprint 0 / Blocs 0.2d + 0.3 + 0.4 — Correctifs schéma

-- ── documents.next_review_date (fix KPI docs_to_review) ────────────────────
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS next_review_date DATE;

CREATE INDEX IF NOT EXISTS documents_next_review_date_idx
  ON documents(next_review_date)
  WHERE next_review_date IS NOT NULL;

-- ── non_conformities.root_cause_id (KPI nc_recurrence_rate) ─────────────────
ALTER TABLE non_conformities
  ADD COLUMN IF NOT EXISTS root_cause_id UUID REFERENCES non_conformities(id);

CREATE INDEX IF NOT EXISTS nc_root_cause_idx
  ON non_conformities(root_cause_id)
  WHERE root_cause_id IS NOT NULL;

-- ── organisations.health_score_config (Bloc 0.4) ─────────────────────────────
ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS health_score_config JSONB DEFAULT '{
    "enabled": true,
    "dimensions": [
      {"id": "actions_on_time",    "label": "Actions à jour",      "weight": 25, "enabled": true, "threshold_green": 80, "threshold_amber": 60},
      {"id": "processes_reviewed", "label": "Processus révisés",   "weight": 25, "enabled": true, "threshold_green": 80, "threshold_amber": 60},
      {"id": "docs_valid",         "label": "Documents valides",   "weight": 25, "enabled": true, "threshold_green": 90, "threshold_amber": 70},
      {"id": "kpis_met",           "label": "KPIs atteints",       "weight": 25, "enabled": true, "threshold_green": 75, "threshold_amber": 50}
    ]
  }'::jsonb;
