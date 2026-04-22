-- Migration 018 : IA désactivée par défaut + flag ai_enabled
-- Les orgs doivent activer explicitement l'IA (coût API Anthropic)

ALTER TABLE organisations
  ADD COLUMN ai_enabled BOOLEAN NOT NULL DEFAULT false;

-- Commentaire explicatif pour la DB
COMMENT ON COLUMN organisations.ai_enabled IS
  'IA activée manuellement par le superadmin — désactivé par défaut (coût Anthropic)';
