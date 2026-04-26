-- Migration 024 : Idempotent — processes, process_reviews, non_conformities, actions.process_id
-- Toutes ces tables et leurs politiques granulaires existent depuis migrations 004, 005, 011.
-- Ce fichier garantit leur présence sur tout environnement via IF NOT EXISTS + DO blocks.

CREATE TABLE IF NOT EXISTS processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id),
  parent_id UUID REFERENCES processes(id),
  level TEXT DEFAULT 'process' CHECK (level IN ('process','subprocess','activity')),
  title TEXT NOT NULL,
  process_code TEXT,
  process_type TEXT DEFAULT 'operational'
    CHECK (process_type IN ('management','operational','support')),
  description TEXT, category TEXT,
  owner_id UUID REFERENCES auth.users(id),
  pilot_id UUID REFERENCES auth.users(id),
  version TEXT DEFAULT 'v1.0',
  status TEXT DEFAULT 'active' CHECK (status IN ('draft','active','deprecated')),
  purpose TEXT, scope TEXT, inputs TEXT, outputs TEXT,
  risks TEXT, performance_criteria TEXT,
  review_frequency TEXT DEFAULT 'annual',
  last_review_date DATE, next_review_date DATE,
  health_score INTEGER,
  diagram_type TEXT CHECK (diagram_type IN ('native','bpmn','drawio')),
  diagram_data JSONB,
  visibility TEXT DEFAULT 'public',
  visibility_user_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE processes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "org members manage processes" ON processes
    FOR ALL USING (
      organisation_id IN (
        SELECT organisation_id FROM organisation_members
        WHERE user_id = auth.uid() AND is_active = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE actions ADD COLUMN IF NOT EXISTS process_id UUID REFERENCES processes(id);

CREATE TABLE IF NOT EXISTS process_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID REFERENCES processes(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  review_date DATE NOT NULL,
  reviewer_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','completed')),
  findings TEXT, conclusions TEXT, next_review_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE process_reviews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "org members manage process_reviews" ON process_reviews
    FOR ALL USING (
      organisation_id IN (
        SELECT organisation_id FROM organisation_members
        WHERE user_id = auth.uid() AND is_active = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS non_conformities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  process_id UUID REFERENCES processes(id),
  title TEXT NOT NULL, description TEXT,
  detected_by UUID REFERENCES auth.users(id),
  detected_at DATE DEFAULT CURRENT_DATE,
  severity TEXT DEFAULT 'minor' CHECK (severity IN ('minor','major','critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open','in_treatment','closed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE non_conformities ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "org members manage nc" ON non_conformities
    FOR ALL USING (
      organisation_id IN (
        SELECT organisation_id FROM organisation_members
        WHERE user_id = auth.uid() AND is_active = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
