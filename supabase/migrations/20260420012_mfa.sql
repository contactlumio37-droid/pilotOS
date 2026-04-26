-- PilotOS — Migration 012 : MFA (enrollments TOTP + Email OTP challenges)

-- ============================================================
-- Enrollments MFA (méthode choisie par utilisateur)
-- ============================================================
CREATE TABLE IF NOT EXISTS mfa_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('totp', 'email_otp')),
  -- TOTP : factor_id Supabase MFA natif
  totp_factor_id TEXT,
  -- Email OTP : pas de secret côté client
  is_active BOOLEAN DEFAULT false,
  enrolled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE mfa_enrollments ENABLE ROW LEVEL SECURITY;

-- Un utilisateur ne voit et gère que son propre enrollment
CREATE POLICY "mfa_enrollment_own" ON mfa_enrollments
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS mfa_enrollments_user_id_idx ON mfa_enrollments(user_id);

-- ============================================================
-- Challenges Email OTP (codes temporaires 10 min)
-- ============================================================
CREATE TABLE IF NOT EXISTS mfa_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL, -- hash bcrypt du code (jamais stocké en clair)
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE mfa_challenges ENABLE ROW LEVEL SECURITY;

-- Lecture uniquement pour l'utilisateur propriétaire
CREATE POLICY "mfa_challenge_own_read" ON mfa_challenges
  FOR SELECT USING (user_id = auth.uid());

-- Insertion autorisée pour l'utilisateur authentifié
CREATE POLICY "mfa_challenge_own_insert" ON mfa_challenges
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Mise à jour (marquer comme utilisé) via service_role uniquement
-- (appelé depuis l'Edge Function verify-mfa)

CREATE INDEX IF NOT EXISTS mfa_challenges_user_id_idx ON mfa_challenges(user_id);
CREATE INDEX IF NOT EXISTS mfa_challenges_expires_at_idx ON mfa_challenges(expires_at);

-- ============================================================
-- Nettoyage automatique des challenges expirés (appelé par cron)
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_expired_mfa_challenges()
RETURNS void AS $$
BEGIN
  DELETE FROM mfa_challenges
  WHERE expires_at < now() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
