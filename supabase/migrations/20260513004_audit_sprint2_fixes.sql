-- ============================================================
-- Migration : 20260513004_audit_sprint2_fixes.sql
-- Bugs critiques identifiés lors de l'audit Sprint 2 (2026-05-13)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- [NEW-C-01] notifications : colonnes manquantes pour les alertes EPI/habilitations
--
-- La fonction notify_epi_habilitation_alerts() insère entity_type et entity_id
-- mais ces colonnes n'existent pas dans la table notifications.
-- Toutes les alertes EPI/habilitation échouaient silencieusement.
-- ────────────────────────────────────────────────────────────

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id   UUID;

CREATE INDEX IF NOT EXISTS idx_notifications_entity
  ON notifications(entity_type, entity_id)
  WHERE entity_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- [NEW-C-01 + NEW-C-03] Contrainte UNIQUE pour dédupliquer les alertes
--
-- ON CONFLICT DO NOTHING dans notify_epi_habilitation_alerts()
-- est inopérant sans contrainte UNIQUE. Sans cette contrainte,
-- plusieurs exécutions du cron génèrent des doublons de notifications.
-- ────────────────────────────────────────────────────────────

ALTER TABLE notifications
  ADD CONSTRAINT uniq_notification_entity
  UNIQUE (organisation_id, user_id, type, entity_type, entity_id);

-- ────────────────────────────────────────────────────────────
-- [NEW-H-03 / NEW-N-01] Planifier les alertes EPI/habilitations via pg_cron
--
-- La fonction notify_epi_habilitation_alerts() était créée mais
-- jamais planifiée. Alertes à J-30 et J-7 avant expiration.
-- ────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Supprimer si déjà planifié (idempotence)
    PERFORM cron.unschedule('notify-epi-habilitation-alerts-daily')
      WHERE EXISTS (
        SELECT 1 FROM cron.job WHERE jobname = 'notify-epi-habilitation-alerts-daily'
      );

    PERFORM cron.schedule(
      'notify-epi-habilitation-alerts-daily',
      '0 7 * * *',  -- Tous les jours à 7h UTC (après notify-late-actions à 8h)
      'SELECT notify_epi_habilitation_alerts();'
    );
  END IF;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- [NEW-N-01] habilitation_attributions : contrainte UNIQUE sur attribution active
--
-- Empêche plusieurs attributions actives du même type d'habilitation
-- pour le même utilisateur dans la même organisation.
-- ────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uniq_hab_attr_active'
      AND conrelid = 'habilitation_attributions'::regclass
  ) THEN
    ALTER TABLE habilitation_attributions
      ADD CONSTRAINT uniq_hab_attr_active
      UNIQUE (organisation_id, habilitation_id, user_id);
  END IF;
END;
$$;
