-- Sprint 5 — CODIR Hub & BI
-- codir_review_meetings : comptes-rendus de réunions de pilotage
-- kpi_snapshots : historique KPIs pour tendances BI (alimenté par cron)

-- ── codir_review_meetings ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS codir_review_meetings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  meeting_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  facilitator_id   UUID REFERENCES auth.users(id),
  attendees_ids    UUID[] NOT NULL DEFAULT '{}',
  decision_ids     UUID[] NOT NULL DEFAULT '{}',
  status           TEXT NOT NULL DEFAULT 'planned'
                     CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  notes            TEXT,
  next_meeting_date DATE,
  visibility       TEXT NOT NULL DEFAULT 'managers'
                     CHECK (visibility IN ('public', 'managers', 'restricted', 'confidential')),
  created_by       UUID NOT NULL REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE codir_review_meetings ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS codir_meetings_updated_at ON codir_review_meetings;
CREATE TRIGGER codir_meetings_updated_at
  BEFORE UPDATE ON codir_review_meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS codir_meetings_org_date_idx
  ON codir_review_meetings(organisation_id, meeting_date DESC);

-- Managers+ peuvent voir les réunions de leur organisation
CREATE POLICY "codir_meetings_select" ON codir_review_meetings FOR SELECT
  USING (is_superadmin() OR is_manager_or_above(organisation_id));

-- Directeurs et admins peuvent créer
CREATE POLICY "codir_meetings_insert" ON codir_review_meetings FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND (
      is_superadmin()
      OR EXISTS (
        SELECT 1 FROM organisation_members om
        WHERE om.organisation_id = codir_review_meetings.organisation_id
          AND om.user_id = auth.uid()
          AND om.is_active = true
          AND om.role IN ('admin', 'director')
      )
    )
  );

-- Le créateur ou admin peut modifier
CREATE POLICY "codir_meetings_update" ON codir_review_meetings FOR UPDATE
  USING (
    created_by = auth.uid()
    OR is_superadmin()
    OR is_manager_or_above(organisation_id)
  );

-- Directeurs et admins peuvent supprimer
CREATE POLICY "codir_meetings_delete" ON codir_review_meetings FOR DELETE
  USING (
    is_superadmin()
    OR (created_by = auth.uid() AND status IN ('planned', 'cancelled'))
    OR EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.organisation_id = codir_review_meetings.organisation_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
        AND om.role IN ('admin', 'director')
    )
  );

-- ── kpi_snapshots ─────────────────────────────────────────────────────────────
-- Alimenté par un cron quotidien — Sprint 5 scaffolde la table,
-- les inserts seront faits par l'Edge Function dashboard-kpis (plan Pro+)

CREATE TABLE IF NOT EXISTS kpi_snapshots (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  kpi_id           TEXT NOT NULL,
  snapshot_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  value            NUMERIC NOT NULL,
  target           NUMERIC,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organisation_id, kpi_id, snapshot_date)
);

ALTER TABLE kpi_snapshots ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS kpi_snapshots_org_date_idx
  ON kpi_snapshots(organisation_id, snapshot_date DESC, kpi_id);

CREATE POLICY "kpi_snapshots_select" ON kpi_snapshots FOR SELECT
  USING (is_superadmin() OR is_manager_or_above(organisation_id));

CREATE POLICY "kpi_snapshots_insert" ON kpi_snapshots FOR INSERT
  WITH CHECK (is_superadmin() OR is_manager_or_above(organisation_id));
