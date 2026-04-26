-- PilotOS — Migration 003 : Pilotage stratégique (objectifs, décisions CODIR, projets)

-- ============================================================
-- Objectifs stratégiques
-- ============================================================
CREATE TABLE IF NOT EXISTS strategic_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id),
  title TEXT NOT NULL,
  description TEXT,
  axis TEXT,
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft','active','completed','cancelled')),
  owner_id UUID REFERENCES auth.users(id),
  kpi_label TEXT,
  kpi_target NUMERIC,
  kpi_unit TEXT,
  start_date DATE,
  end_date DATE,
  visibility TEXT DEFAULT 'public'
    CHECK (visibility IN ('public','managers','restricted','confidential')),
  visibility_user_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE strategic_objectives ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS strategic_objectives_updated_at ON strategic_objectives;
CREATE TRIGGER strategic_objectives_updated_at
  BEFORE UPDATE ON strategic_objectives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Décisions CODIR
-- ============================================================
CREATE TABLE IF NOT EXISTS codir_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  decision_date DATE NOT NULL,
  author_id UUID REFERENCES auth.users(id),
  objective_id UUID REFERENCES strategic_objectives(id),
  visibility TEXT DEFAULT 'managers'
    CHECK (visibility IN ('public','managers','restricted','confidential')),
  visibility_user_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE codir_decisions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Projets
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id),
  title TEXT NOT NULL,
  description TEXT,
  objective_id UUID REFERENCES strategic_objectives(id),
  status TEXT DEFAULT 'active'
    CHECK (status IN ('draft','active','completed','cancelled')),
  start_date DATE,
  end_date DATE,
  visibility TEXT DEFAULT 'public'
    CHECK (visibility IN ('public','managers','restricted','confidential')),
  visibility_user_ids UUID[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
