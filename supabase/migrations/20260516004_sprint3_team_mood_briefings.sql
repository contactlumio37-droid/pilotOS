-- Sprint 3 — Humeur équipe & briefings 5 minutes
-- team_moods : check-in journalier par utilisateur (1 par user/org/jour)
-- team_briefings : comptes-rendus de réunions courtes (manager/director/admin)

-- ── team_moods ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS team_moods (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood             SMALLINT NOT NULL CHECK (mood BETWEEN 1 AND 5),
  note             TEXT CHECK (char_length(note) <= 200),
  date             DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organisation_id, user_id, date)
);

ALTER TABLE team_moods ENABLE ROW LEVEL SECURITY;

-- Un membre actif peut soumettre sa propre humeur
CREATE POLICY "team_moods_insert_own" ON team_moods FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.organisation_id = team_moods.organisation_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

-- Tous les membres actifs de l'org peuvent voir les humeurs
CREATE POLICY "team_moods_select" ON team_moods FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.organisation_id = team_moods.organisation_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

-- Un membre peut modifier sa propre humeur du jour
CREATE POLICY "team_moods_update_own_today" ON team_moods FOR UPDATE
  USING (user_id = auth.uid() AND date = CURRENT_DATE);

-- Un membre peut supprimer sa propre humeur du jour
CREATE POLICY "team_moods_delete_own_today" ON team_moods FOR DELETE
  USING (user_id = auth.uid() AND date = CURRENT_DATE);

CREATE INDEX IF NOT EXISTS team_moods_org_date_idx ON team_moods(organisation_id, date DESC);

-- ── team_briefings ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS team_briefings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  created_by       UUID NOT NULL REFERENCES auth.users(id),
  title            TEXT,
  content          TEXT NOT NULL DEFAULT '',
  duration_minutes SMALLINT NOT NULL DEFAULT 5 CHECK (duration_minutes BETWEEN 1 AND 120),
  date             DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE team_briefings ENABLE ROW LEVEL SECURITY;

-- Managers, directeurs et admins peuvent créer un brief
CREATE POLICY "team_briefings_insert" ON team_briefings FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.organisation_id = team_briefings.organisation_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
        AND om.role IN ('admin', 'director', 'manager')
    )
  );

-- Tous les membres actifs peuvent lire les briefings
CREATE POLICY "team_briefings_select" ON team_briefings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.organisation_id = team_briefings.organisation_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

-- Le créateur peut modifier son brief
CREATE POLICY "team_briefings_update" ON team_briefings FOR UPDATE
  USING (created_by = auth.uid());

-- Le créateur ou un admin/directeur peut supprimer
CREATE POLICY "team_briefings_delete" ON team_briefings FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM organisation_members om
      WHERE om.organisation_id = team_briefings.organisation_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
        AND om.role IN ('admin', 'director')
    )
  );

CREATE TRIGGER team_briefings_updated_at
  BEFORE UPDATE ON team_briefings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS team_briefings_org_date_idx ON team_briefings(organisation_id, date DESC);
