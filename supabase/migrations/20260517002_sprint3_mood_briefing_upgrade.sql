-- Sprint 3 / BLOC 3.2 — team_mood_enabled toggle + briefing model upgrade

-- ── team_mood_enabled on organisations ───────────────────────────────────────
ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS team_mood_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- ── Upgrade team_briefings : status lifecycle + richer fields ─────────────────
ALTER TABLE team_briefings
  ADD COLUMN IF NOT EXISTS status         TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'open', 'closed')),
  ADD COLUMN IF NOT EXISTS scheduled_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS top_down_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS team_lead_items JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ── briefing_contributions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS briefing_contributions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_id     UUID NOT NULL REFERENCES team_briefings(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content         TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 1000),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(briefing_id, user_id)
);

ALTER TABLE briefing_contributions ENABLE ROW LEVEL SECURITY;

-- Tout membre actif peut soumettre une contribution quand le briefing est ouvert
CREATE POLICY "briefing_contributions_insert" ON briefing_contributions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.organisation_id = briefing_contributions.organisation_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM team_briefings tb
      WHERE tb.id = briefing_contributions.briefing_id
        AND tb.status = 'open'
    )
  );

-- Tous les membres actifs peuvent lire les contributions
CREATE POLICY "briefing_contributions_select" ON briefing_contributions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.organisation_id = briefing_contributions.organisation_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

-- Un membre peut modifier sa propre contribution tant que le briefing est ouvert
CREATE POLICY "briefing_contributions_update" ON briefing_contributions FOR UPDATE
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM team_briefings tb
      WHERE tb.id = briefing_contributions.briefing_id
        AND tb.status = 'open'
    )
  );

-- Un membre peut supprimer sa propre contribution ou un admin/directeur peut supprimer
CREATE POLICY "briefing_contributions_delete" ON briefing_contributions FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.organisation_id = briefing_contributions.organisation_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
        AND om.role IN ('admin', 'director')
    )
  );

CREATE INDEX IF NOT EXISTS briefing_contributions_briefing_idx ON briefing_contributions(briefing_id);
CREATE INDEX IF NOT EXISTS briefing_contributions_org_idx ON briefing_contributions(organisation_id);

-- ── briefing_attendees ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS briefing_attendees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_id     UUID NOT NULL REFERENCES team_briefings(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attended        BOOLEAN NOT NULL DEFAULT TRUE,
  marked_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(briefing_id, user_id)
);

ALTER TABLE briefing_attendees ENABLE ROW LEVEL SECURITY;

-- Managers, directeurs et admins peuvent gérer la présence
CREATE POLICY "briefing_attendees_insert" ON briefing_attendees FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.organisation_id = briefing_attendees.organisation_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
        AND om.role IN ('admin', 'director', 'manager')
    )
  );

-- Tous les membres actifs peuvent lire les présences
CREATE POLICY "briefing_attendees_select" ON briefing_attendees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.organisation_id = briefing_attendees.organisation_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

CREATE POLICY "briefing_attendees_update" ON briefing_attendees FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.organisation_id = briefing_attendees.organisation_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
        AND om.role IN ('admin', 'director', 'manager')
    )
  );

CREATE POLICY "briefing_attendees_delete" ON briefing_attendees FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.organisation_id = briefing_attendees.organisation_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
        AND om.role IN ('admin', 'director')
    )
  );

CREATE INDEX IF NOT EXISTS briefing_attendees_briefing_idx ON briefing_attendees(briefing_id);
CREATE INDEX IF NOT EXISTS briefing_attendees_org_idx ON briefing_attendees(organisation_id);
