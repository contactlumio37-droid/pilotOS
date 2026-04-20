-- PilotOS — Migration 005 : Actions et commentaires d'actions

-- ============================================================
-- Actions (plan d'actions transversal)
-- ============================================================
CREATE TABLE actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  process_id UUID REFERENCES processes(id),
  objective_id UUID REFERENCES strategic_objectives(id),
  terrain_report_id UUID REFERENCES terrain_reports(id),
  process_review_id UUID REFERENCES process_reviews(id),
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
  consulted_ids UUID[] DEFAULT '{}',
  informed_ids UUID[] DEFAULT '{}',
  visibility TEXT DEFAULT 'public'
    CHECK (visibility IN ('public','managers','restricted','confidential')),
  visibility_user_ids UUID[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE actions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER actions_updated_at
  BEFORE UPDATE ON actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexation pour les requêtes fréquentes
CREATE INDEX actions_organisation_id_idx ON actions(organisation_id);
CREATE INDEX actions_responsible_id_idx ON actions(responsible_id);
CREATE INDEX actions_status_idx ON actions(status);
CREATE INDEX actions_due_date_idx ON actions(due_date);

-- ============================================================
-- Commentaires sur actions
-- ============================================================
CREATE TABLE action_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE action_comments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Fonction : mise à jour auto statut "late"
-- ============================================================
CREATE OR REPLACE FUNCTION update_late_actions()
RETURNS void AS $$
BEGIN
  UPDATE actions
  SET status = 'late'
  WHERE status IN ('todo','in_progress')
    AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
