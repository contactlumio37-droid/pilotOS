-- Migration 020 : Module Sécurité / QSE
-- Tables : duer_evaluations, prevention_plans, incidents, safety_visits, regulatory_register

-- ============================================================
-- DUER — Document Unique d'Évaluation des Risques
-- ============================================================
CREATE TABLE IF NOT EXISTS duer_evaluations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id   UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  site_id           UUID REFERENCES sites(id) ON DELETE SET NULL,
  work_unit         TEXT NOT NULL,
  hazard            TEXT NOT NULL,
  risk_description  TEXT NOT NULL,
  -- Cotation risque : probabilité × gravité
  probability       INTEGER NOT NULL CHECK (probability BETWEEN 1 AND 5),
  severity          INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 5),
  risk_score        INTEGER GENERATED ALWAYS AS (probability * severity) STORED,
  -- Mesures de prévention
  prevention_measures TEXT,
  residual_risk     INTEGER CHECK (residual_risk BETWEEN 1 AND 25),
  -- Responsable et dates
  responsible_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  review_date       DATE,
  status            TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','archived','under_review')),
  visibility        TEXT NOT NULL DEFAULT 'internal'
    CHECK (visibility IN ('public','internal','confidential')),
  visibility_user_ids UUID[] DEFAULT '{}',
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE duer_evaluations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS duer_org_idx      ON duer_evaluations(organisation_id);
CREATE INDEX IF NOT EXISTS duer_status_idx   ON duer_evaluations(status);
CREATE INDEX IF NOT EXISTS duer_score_idx    ON duer_evaluations(risk_score DESC);

-- ============================================================
-- PLANS DE PRÉVENTION — Entreprises extérieures
-- ============================================================
CREATE TABLE IF NOT EXISTS prevention_plans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id   UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  site_id           UUID REFERENCES sites(id) ON DELETE SET NULL,
  external_company  TEXT NOT NULL,
  activity          TEXT NOT NULL,
  start_date        DATE NOT NULL,
  end_date          DATE,
  prevention_measures TEXT,
  inspector_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','completed','cancelled')),
  visibility        TEXT NOT NULL DEFAULT 'internal'
    CHECK (visibility IN ('public','internal','confidential')),
  visibility_user_ids UUID[] DEFAULT '{}',
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE prevention_plans ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS prevention_plans_org_idx ON prevention_plans(organisation_id);

-- ============================================================
-- INCIDENTS — AT, presqu'accidents, situations dangereuses
-- ============================================================
CREATE TABLE IF NOT EXISTS incidents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id   UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  site_id           UUID REFERENCES sites(id) ON DELETE SET NULL,
  ref               TEXT,                          -- numéro AT CPAM si applicable
  incident_type     TEXT NOT NULL DEFAULT 'near_miss'
    CHECK (incident_type IN ('accident','near_miss','dangerous_situation','first_aid')),
  title             TEXT NOT NULL,
  description       TEXT,
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  location          TEXT,
  victim_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  declared_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Analyse des causes
  root_causes       TEXT,
  contributing_factors TEXT,
  -- Actions correctives → lien table actions
  action_id         UUID REFERENCES actions(id) ON DELETE SET NULL,
  -- Terrain report source
  terrain_report_id UUID REFERENCES terrain_reports(id) ON DELETE SET NULL,
  -- Statut et fermeture
  status            TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','under_analysis','action_in_progress','closed')),
  closed_at         TIMESTAMPTZ,
  closed_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  visibility        TEXT NOT NULL DEFAULT 'confidential'
    CHECK (visibility IN ('public','internal','confidential')),
  visibility_user_ids UUID[] DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS incidents_org_idx    ON incidents(organisation_id);
CREATE INDEX IF NOT EXISTS incidents_status_idx ON incidents(status);
CREATE INDEX IF NOT EXISTS incidents_type_idx   ON incidents(incident_type);
CREATE INDEX IF NOT EXISTS incidents_date_idx   ON incidents(occurred_at DESC);

-- ============================================================
-- VISITES DE SÉCURITÉ
-- ============================================================
CREATE TABLE IF NOT EXISTS safety_visits (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id   UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  site_id           UUID REFERENCES sites(id) ON DELETE SET NULL,
  visit_type        TEXT NOT NULL DEFAULT 'planned'
    CHECK (visit_type IN ('planned','unannounced','audit','inspection')),
  planned_at        DATE NOT NULL,
  conducted_at      DATE,
  inspector_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  scope             TEXT,                          -- périmètre inspecté
  observations      TEXT,
  action_count      INTEGER DEFAULT 0,
  -- Lien vers un groupe d'actions correctives
  action_id         UUID REFERENCES actions(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','completed','cancelled')),
  visibility        TEXT NOT NULL DEFAULT 'internal'
    CHECK (visibility IN ('public','internal','confidential')),
  visibility_user_ids UUID[] DEFAULT '{}',
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE safety_visits ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS safety_visits_org_idx     ON safety_visits(organisation_id);
CREATE INDEX IF NOT EXISTS safety_visits_planned_idx ON safety_visits(planned_at);

-- ============================================================
-- REGISTRE RÉGLEMENTAIRE
-- ============================================================
CREATE TABLE IF NOT EXISTS regulatory_register (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id   UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  obligation        TEXT NOT NULL,
  legal_reference   TEXT,
  category          TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('inspection','training','document','equipment','other')),
  frequency         TEXT,                          -- ex. "Annuel", "Tous les 5 ans"
  due_date          DATE,
  last_done_at      DATE,
  responsible_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'ok'
    CHECK (status IN ('ok','due_soon','overdue','na')),
  notes             TEXT,
  visibility        TEXT NOT NULL DEFAULT 'internal'
    CHECK (visibility IN ('public','internal','confidential')),
  visibility_user_ids UUID[] DEFAULT '{}',
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE regulatory_register ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS reg_register_org_idx    ON regulatory_register(organisation_id);
CREATE INDEX IF NOT EXISTS reg_register_status_idx ON regulatory_register(status);
CREATE INDEX IF NOT EXISTS reg_register_due_idx    ON regulatory_register(due_date);

-- ============================================================
-- TRIGGER updated_at sur toutes les tables
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS duer_updated_at ON duer_evaluations;
CREATE TRIGGER duer_updated_at         BEFORE UPDATE ON duer_evaluations    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS prevention_updated_at ON prevention_plans;
CREATE TRIGGER prevention_updated_at   BEFORE UPDATE ON prevention_plans    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS incidents_updated_at ON incidents;
CREATE TRIGGER incidents_updated_at    BEFORE UPDATE ON incidents           FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS safety_visits_updated_at ON safety_visits;
CREATE TRIGGER safety_visits_updated_at BEFORE UPDATE ON safety_visits      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS reg_register_updated_at ON regulatory_register;
CREATE TRIGGER reg_register_updated_at BEFORE UPDATE ON regulatory_register FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- DUER
CREATE POLICY "duer_org_member_read" ON duer_evaluations FOR SELECT TO authenticated
  USING (is_manager_or_above(organisation_id));

CREATE POLICY "duer_manager_write" ON duer_evaluations FOR ALL TO authenticated
  USING (is_manager_or_above(organisation_id))
  WITH CHECK (is_manager_or_above(organisation_id));

-- Prevention plans
CREATE POLICY "prevention_org_member_read" ON prevention_plans FOR SELECT TO authenticated
  USING (is_manager_or_above(organisation_id));

CREATE POLICY "prevention_manager_write" ON prevention_plans FOR ALL TO authenticated
  USING (is_manager_or_above(organisation_id))
  WITH CHECK (is_manager_or_above(organisation_id));

-- Incidents (confidential by default — manager+)
CREATE POLICY "incidents_org_manager_read" ON incidents FOR SELECT TO authenticated
  USING (
    is_manager_or_above(organisation_id)
    OR declared_by = auth.uid()
    OR victim_id   = auth.uid()
  );

CREATE POLICY "incidents_declare_insert" ON incidents FOR INSERT TO authenticated
  WITH CHECK (organisation_id IN (
    SELECT organisation_id FROM organisation_members
    WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "incidents_manager_update" ON incidents FOR UPDATE TO authenticated
  USING (is_manager_or_above(organisation_id));

-- Safety visits
CREATE POLICY "safety_visits_read" ON safety_visits FOR SELECT TO authenticated
  USING (is_manager_or_above(organisation_id));

CREATE POLICY "safety_visits_write" ON safety_visits FOR ALL TO authenticated
  USING (is_manager_or_above(organisation_id))
  WITH CHECK (is_manager_or_above(organisation_id));

-- Regulatory register
CREATE POLICY "reg_register_read" ON regulatory_register FOR SELECT TO authenticated
  USING (is_manager_or_above(organisation_id));

CREATE POLICY "reg_register_write" ON regulatory_register FOR ALL TO authenticated
  USING (is_manager_or_above(organisation_id))
  WITH CHECK (is_manager_or_above(organisation_id));

-- ============================================================
-- KPI CATALOGUE — Sécurité
-- ============================================================
INSERT INTO kpi_catalog (name, label, description, unit, module, role_min, is_active) VALUES
  ('days_without_incident',    'Jours sans incident',        'Nombre de jours depuis le dernier incident/AT déclaré',       'days',    'securite', 'manager', true),
  ('at_open',                  'AT ouverts',                 'Nombre d''accidents du travail non clôturés',                  'count',   'securite', 'manager', true),
  ('near_miss_open',           'Presqu''accidents ouverts',  'Situations dangereuses et presqu''accidents non traités',      'count',   'manager',  'manager', true),
  ('safety_visits_planned',    'Visites planifiées',         'Visites de sécurité prévues dans les 30 prochains jours',      'count',   'securite', 'manager', true),
  ('duer_review_date',         'Révision DUER',              'Date de la prochaine révision du Document Unique',             'date',    'securite', 'manager', true),
  ('regulatory_overdue',       'Obligations en retard',      'Obligations réglementaires dont la date limite est dépassée',  'count',   'securite', 'manager', true)
ON CONFLICT (name) DO NOTHING;
