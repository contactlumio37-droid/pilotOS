-- Migration 014 : Invitations membres
-- Permet aux admins d'inviter des utilisateurs par email.
-- L'invitation est acceptée via accept_invitation() au premier login.

CREATE TABLE IF NOT EXISTS member_invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'contributor'
    CHECK (role IN ('admin','manager','director','contributor','terrain','reader')),
  invited_by      UUID NOT NULL REFERENCES auth.users(id),
  token           TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organisation_id, email)
);

ALTER TABLE member_invitations ENABLE ROW LEVEL SECURITY;

-- Admins peuvent gérer les invitations de leur organisation
CREATE POLICY "invitations_admin_manage" ON member_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organisation_members
      WHERE user_id = auth.uid()
        AND organisation_id = member_invitations.organisation_id
        AND role IN ('admin','superadmin')
        AND is_active = true
    )
  );

-- Un utilisateur peut lire les invitations envoyées à son email
CREATE POLICY "invitations_own_read" ON member_invitations
  FOR SELECT USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- ============================================================
-- Fonction : accepter une invitation
-- ============================================================
CREATE OR REPLACE FUNCTION accept_invitation(p_token TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inv member_invitations%ROWTYPE;
BEGIN
  SELECT * INTO v_inv
  FROM member_invitations
  WHERE token = p_token
    AND accepted_at IS NULL
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation invalide ou expirée';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND email = v_inv.email
  ) THEN
    RAISE EXCEPTION 'Cette invitation ne vous est pas destinée';
  END IF;

  INSERT INTO organisation_members (
    organisation_id, user_id, role, invited_by, accepted_at
  ) VALUES (
    v_inv.organisation_id, auth.uid(), v_inv.role, v_inv.invited_by, now()
  )
  ON CONFLICT (organisation_id, user_id) DO UPDATE
    SET role        = EXCLUDED.role,
        accepted_at = now(),
        is_active   = true;

  UPDATE member_invitations SET accepted_at = now() WHERE id = v_inv.id;
END;
$$;
