-- ============================================
-- AUTH MULTI-MODE — PilotOS
-- Supporte 4 modes d'entrée dans l'application
-- ============================================

-- Table des invitations (pour import CSV et manuel)
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'contributor'
    CHECK (role IN ('admin','manager','contributor','terrain','reader','director')),
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  mode TEXT NOT NULL DEFAULT 'manual'
    CHECK (mode IN ('free','paid','csv_import','manual')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','expired','cancelled')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour lookup par token (lien d'invitation)
CREATE INDEX IF NOT EXISTS idx_invitations_token
  ON invitations(token);

-- Index pour lookup par email + organisation
CREATE INDEX IF NOT EXISTS idx_invitations_email_org
  ON invitations(email, organisation_id);

-- RLS invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- SELECT : admin et superadmin voient les invitations de leur org
CREATE POLICY "invitations_select_admin"
ON invitations FOR SELECT TO authenticated
USING (
  organisation_id IN (
    SELECT organisation_id FROM organisation_members
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- INSERT : admin et superadmin peuvent créer des invitations
CREATE POLICY "invitations_insert_admin"
ON invitations FOR INSERT TO authenticated
WITH CHECK (
  organisation_id IN (
    SELECT organisation_id FROM organisation_members
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- UPDATE : admin et superadmin peuvent modifier le statut
CREATE POLICY "invitations_update_admin"
ON invitations FOR UPDATE TO authenticated
USING (
  organisation_id IN (
    SELECT organisation_id FROM organisation_members
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'superadmin')
  )
);

-- SELECT public : n'importe qui avec le token peut voir
-- l'invitation (pour la page d'acceptation sans auth)
CREATE POLICY "invitations_select_by_token"
ON invitations FOR SELECT TO anon
USING (
  status = 'pending'
  AND expires_at > now()
);

-- Colonne mode_inscription sur organisations
ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS inscription_mode TEXT NOT NULL DEFAULT 'free'
    CHECK (inscription_mode IN ('free','paid','invite_only'));

-- free        : inscription libre, tout le monde peut créer un compte
-- paid        : inscription via Stripe, vérification paiement avant accès
-- invite_only : uniquement via lien d'invitation admin
