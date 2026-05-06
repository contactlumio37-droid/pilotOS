-- =============================================================
-- PilotOS — Migration 20260506002 : RACI backfill
-- Sprint 2 — v0.5.0
-- =============================================================

-- Backfill responsible_ids depuis responsible_id
-- (colonnes array ajoutées dans 20260501001 mais pas backfillées)
UPDATE actions
SET responsible_ids = ARRAY[responsible_id]
WHERE responsible_id IS NOT NULL
  AND (responsible_ids IS NULL OR responsible_ids = '{}');

-- Backfill accountable_ids depuis accountable_id
UPDATE actions
SET accountable_ids = ARRAY[accountable_id]
WHERE accountable_id IS NOT NULL
  AND (accountable_ids IS NULL OR accountable_ids = '{}');

-- Index GIN idempotents
CREATE INDEX IF NOT EXISTS actions_responsible_ids_gin
  ON actions USING GIN (responsible_ids);
CREATE INDEX IF NOT EXISTS actions_accountable_ids_gin
  ON actions USING GIN (accountable_ids);
