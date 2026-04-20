-- PilotOS — Migration 004 : Processus, Revues, Non-conformités, Kaizen
-- NOTE : terrain_reports créé ici SANS FK vers actions (circulaire → ajoutée dans migration 006)

-- ============================================================
-- Processus
-- ============================================================
CREATE TABLE processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id),
  parent_id UUID REFERENCES processes(id),
  level TEXT DEFAULT 'process'
    CHECK (level IN ('process','subprocess','activity')),
  -- Identification
  title TEXT NOT NULL,
  process_code TEXT,
  process_type TEXT DEFAULT 'operational'
    CHECK (process_type IN ('management','operational','support')),
  description TEXT,
  category TEXT,
  version TEXT DEFAULT 'v1.0',
  status TEXT DEFAULT 'active'
    CHECK (status IN ('draft','active','deprecated')),
  -- Responsables ISO 9001
  owner_id UUID REFERENCES auth.users(id),
  pilot_id UUID REFERENCES auth.users(id),
  backup_pilot_id UUID REFERENCES auth.users(id),
  -- Description ISO 9001 §7.5
  purpose TEXT,
  scope TEXT,
  inputs TEXT,
  outputs TEXT,
  resources TEXT,
  risks TEXT,
  performance_criteria TEXT,
  -- Revue périodique
  review_frequency TEXT DEFAULT 'annual'
    CHECK (review_frequency IN ('monthly','quarterly','annual','biannual')),
  last_review_date DATE,
  next_review_date DATE,
  -- Cartographie
  health_score INTEGER,
  diagram_type TEXT CHECK (diagram_type IN ('native','bpmn','drawio')),
  diagram_data JSONB,
  -- Visibilité
  visibility TEXT DEFAULT 'public'
    CHECK (visibility IN ('public','managers','restricted','confidential')),
  visibility_user_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE processes ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER processes_updated_at
  BEFORE UPDATE ON processes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Revues de processus
-- ============================================================
CREATE TABLE process_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  review_date DATE NOT NULL,
  reviewer_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','completed')),
  findings TEXT,
  conclusions TEXT,
  next_review_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE process_reviews ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Non-conformités
-- ============================================================
CREATE TABLE non_conformities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  process_id UUID REFERENCES processes(id),
  title TEXT NOT NULL,
  description TEXT,
  detected_by UUID REFERENCES auth.users(id),
  detected_at DATE DEFAULT CURRENT_DATE,
  severity TEXT DEFAULT 'minor'
    CHECK (severity IN ('minor','major','critical')),
  status TEXT DEFAULT 'open'
    CHECK (status IN ('open','in_treatment','closed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE non_conformities ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Plans Kaizen
-- ============================================================
CREATE TABLE kaizen_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  process_id UUID REFERENCES processes(id),
  title TEXT NOT NULL,
  objective TEXT,
  estimated_savings_hours INTEGER,
  status TEXT DEFAULT 'planned'
    CHECK (status IN ('planned','in_progress','completed')),
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE kaizen_plans ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Signalements terrain (SANS FK vers actions — ajouté migration 006)
-- ============================================================
CREATE TABLE terrain_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id),
  reported_by UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  location TEXT,
  description TEXT,
  photo_url TEXT,
  category TEXT DEFAULT 'other'
    CHECK (category IN ('safety','quality','equipment','process','other')),
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','acknowledged','converted','closed')),
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  -- action_id ajouté après création table actions (migration 006)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE terrain_reports ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER terrain_reports_updated_at
  BEFORE UPDATE ON terrain_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
