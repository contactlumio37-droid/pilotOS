-- Migration 022 : Ajout colonnes manquantes (idempotent via IF NOT EXISTS)
-- organisations.ai_enabled, projects enrichissement, strategic_objectives enrichissement

ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT false;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS visibility_user_ids UUID[],
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE strategic_objectives
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS axis TEXT,
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS kpi_label TEXT,
  ADD COLUMN IF NOT EXISTS kpi_target NUMERIC,
  ADD COLUMN IF NOT EXISTS kpi_unit TEXT,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS visibility_user_ids UUID[],
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
