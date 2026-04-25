-- Migration 023 : Politique RLS consolidée pour actions (idempotent)
-- CREATE TABLE + ENABLE RLS sont des no-ops (table existe depuis migration 005).
-- Seule la politique "org members manage actions" est nouvelle.

CREATE TABLE IF NOT EXISTS actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  objective_id UUID REFERENCES strategic_objectives(id),
  terrain_report_id UUID,
  process_review_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  origin TEXT DEFAULT 'manual'
    CHECK (origin IN ('manual','process_review','codir','audit','incident','kaizen','terrain')),
  status TEXT DEFAULT 'todo'
    CHECK (status IN ('todo','in_progress','done','cancelled','late')),
  priority TEXT DEFAULT 'medium'
    CHECK (priority IN ('low','medium','high','critical')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  responsible_id UUID REFERENCES auth.users(id),
  accountable_id UUID REFERENCES auth.users(id),
  consulted_ids UUID[],
  informed_ids UUID[],
  visibility TEXT DEFAULT 'public',
  visibility_user_ids UUID[],
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE actions ENABLE ROW LEVEL SECURITY;

-- Politique consolidée FOR ALL (complément aux politiques granulaires de migration 011)
DO $$ BEGIN
  CREATE POLICY "org members manage actions" ON actions
    FOR ALL USING (
      organisation_id IN (
        SELECT organisation_id FROM organisation_members
        WHERE user_id = auth.uid() AND is_active = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
