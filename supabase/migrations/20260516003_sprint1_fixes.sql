-- Sprint 1 — correctifs schéma
-- is_demo : permet d'identifier et supprimer les données de démo de manière ciblée
-- onboarding_progress_dismissed : persist en base plutôt qu'en localStorage

-- ── Colonne is_demo sur les tables métier ─────────────────────────────────────
ALTER TABLE actions
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE non_conformities
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE strategic_objectives
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE terrain_reports
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE processes
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE indicators
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS actions_is_demo_idx               ON actions(is_demo)               WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS non_conformities_is_demo_idx      ON non_conformities(is_demo)      WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS strategic_objectives_is_demo_idx  ON strategic_objectives(is_demo)  WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS terrain_reports_is_demo_idx       ON terrain_reports(is_demo)       WHERE is_demo = true;

-- ── Dismiss onboarding progress en base ──────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_progress_dismissed BOOLEAN NOT NULL DEFAULT false;
