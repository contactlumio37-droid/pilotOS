-- Migration 018 : IA désactivée par défaut + flag ai_enabled
-- Les orgs doivent activer explicitement l'IA (coût API Anthropic)

DO $$
BEGIN
  ALTER TABLE organisations
  ADD COLUMN ai_enabled BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- Commentaire explicatif pour la DB
COMMENT ON COLUMN organisations.ai_enabled IS
  'IA activée manuellement par le superadmin — désactivé par défaut (coût Anthropic)';
