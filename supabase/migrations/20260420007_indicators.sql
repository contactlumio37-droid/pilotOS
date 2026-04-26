-- PilotOS — Migration 007 : Indicateurs et valeurs

-- ============================================================
-- Indicateurs
-- ============================================================
CREATE TABLE indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  unit TEXT,
  target_value NUMERIC,
  warning_threshold NUMERIC,
  critical_threshold NUMERIC,
  frequency TEXT DEFAULT 'monthly'
    CHECK (frequency IN ('daily','weekly','monthly','quarterly','yearly')),
  linked_to TEXT
    CHECK (linked_to IN ('objective','process','project','organisation')),
  linked_id UUID,
  owner_id UUID REFERENCES auth.users(id),
  visibility TEXT DEFAULT 'managers'
    CHECK (visibility IN ('public','managers','restricted','confidential')),
  visibility_user_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE indicators ENABLE ROW LEVEL SECURITY;

CREATE INDEX indicators_organisation_id_idx ON indicators(organisation_id);

-- ============================================================
-- Valeurs d'indicateurs
-- ============================================================
CREATE TABLE indicator_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id UUID NOT NULL REFERENCES indicators(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  measured_at DATE NOT NULL,
  entered_by UUID REFERENCES auth.users(id),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE indicator_values ENABLE ROW LEVEL SECURITY;

CREATE INDEX indicator_values_indicator_id_idx ON indicator_values(indicator_id);
CREATE INDEX indicator_values_measured_at_idx ON indicator_values(measured_at);
