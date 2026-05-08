-- PilotOS — Migration 20260507006 : Préférences de notification par membre
-- Ajoute notification_prefs JSONB sur organisation_members.
-- Idempotente — safe si rejouée.

ALTER TABLE organisation_members
  ADD COLUMN IF NOT EXISTS notification_prefs JSONB NOT NULL DEFAULT '{
    "email_late_actions":   true,
    "email_due_soon":       true,
    "email_digest_weekly":  true,
    "email_document_approval": true
  }'::jsonb;

-- Index GIN pour les requêtes JSONB éventuelles (dashboard superadmin)
CREATE INDEX IF NOT EXISTS organisation_members_notification_prefs_idx
  ON organisation_members USING GIN (notification_prefs);

-- RLS : chaque membre peut lire et modifier ses propres préférences.
-- La policy members_own_read + members_admin_write de migration 011 couvrent
-- déjà la colonne — aucune policy additionnelle requise.
