-- ════════════════════════════════════════════════════════════════
-- BLOC 1 — Onboarding columns + member_invitations + join_requests
-- ════════════════════════════════════════════════════════════════

-- ── 1. profiles — colonnes onboarding ───────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed  boolean   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_step       smallint  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_role       text      CHECK (onboarding_role IN ('quality_manager','hse_manager','operations_manager','executive','consultant','other')),
  ADD COLUMN IF NOT EXISTS onboarding_usages     text[]    NOT NULL DEFAULT '{}';

-- ── 2. organisations — normalised_name (déduplication) ──────────
ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS normalized_name text
    GENERATED ALWAYS AS (
      lower(regexp_replace(trim(name), '[^a-zA-Z0-9]+', '', 'g'))
    ) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS organisations_normalized_name_unique
  ON organisations (normalized_name);

-- ── 3. member_invitations (référencée dans le code, jamais créée) ─
CREATE TABLE IF NOT EXISTS member_invitations (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  email            text        NOT NULL,
  role             text        NOT NULL DEFAULT 'contributor',
  invited_by       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token            text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at       timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE member_invitations ENABLE ROW LEVEL SECURITY;

-- Admins+ peuvent voir/gérer les invitations de leur org
DROP POLICY IF EXISTS "member_invitations_admin_manage" ON member_invitations;
CREATE POLICY "member_invitations_admin_manage" ON member_invitations
  USING (
    organisation_id IN (
      SELECT organisation_id FROM organisation_members
      WHERE user_id = auth.uid() AND is_active = true AND role IN ('admin','manager','director')
    )
  )
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM organisation_members
      WHERE user_id = auth.uid() AND is_active = true AND role IN ('admin','manager','director')
    )
  );

-- Superadmin full access
DROP POLICY IF EXISTS "member_invitations_superadmin" ON member_invitations;
CREATE POLICY "member_invitations_superadmin" ON member_invitations
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true));

-- Un utilisateur peut lire l'invitation liée à son email (pour accepter)
DROP POLICY IF EXISTS "member_invitations_self_read" ON member_invitations;
CREATE POLICY "member_invitations_self_read" ON member_invitations
  FOR SELECT
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- ── 4. join_requests ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS join_requests (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message          text,
  status           text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  reviewed_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),

  UNIQUE (organisation_id, user_id)
);

ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;

-- Le demandeur peut voir ses propres demandes
DROP POLICY IF EXISTS "join_requests_self_read" ON join_requests;
CREATE POLICY "join_requests_self_read" ON join_requests
  FOR SELECT USING (user_id = auth.uid());

-- Le demandeur peut créer une demande
DROP POLICY IF EXISTS "join_requests_self_insert" ON join_requests;
CREATE POLICY "join_requests_self_insert" ON join_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admins de l'org peuvent lire et mettre à jour les demandes
DROP POLICY IF EXISTS "join_requests_admin_manage" ON join_requests;
CREATE POLICY "join_requests_admin_manage" ON join_requests
  USING (
    organisation_id IN (
      SELECT organisation_id FROM organisation_members
      WHERE user_id = auth.uid() AND is_active = true AND role = 'admin'
    )
  )
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM organisation_members
      WHERE user_id = auth.uid() AND is_active = true AND role = 'admin'
    )
  );

-- Superadmin full access
DROP POLICY IF EXISTS "join_requests_superadmin" ON join_requests;
CREATE POLICY "join_requests_superadmin" ON join_requests
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true));

-- ── 5. Index performances ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS join_requests_organisation_id_idx ON join_requests (organisation_id);
CREATE INDEX IF NOT EXISTS join_requests_user_id_idx        ON join_requests (user_id);
CREATE INDEX IF NOT EXISTS join_requests_status_idx          ON join_requests (status);
CREATE INDEX IF NOT EXISTS member_invitations_email_idx      ON member_invitations (email);
CREATE INDEX IF NOT EXISTS member_invitations_token_idx      ON member_invitations (token);
CREATE INDEX IF NOT EXISTS member_invitations_org_id_idx     ON member_invitations (organisation_id);
