-- Sprint 6 — Reader app shell + notifications schema fix + EPI alert cron
-- Adds missing columns to notifications (referenced in database.ts since Sprint 2)
-- Adds cron schedule for notify-epi-alerts Edge Function

-- ── notifications: add entity_type / entity_id ──────────────────────────────────────────

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id   UUID;

CREATE INDEX IF NOT EXISTS notifications_entity_idx
  ON notifications(entity_type, entity_id)
  WHERE entity_type IS NOT NULL;

-- ── Schedule EPI/habilitation alert cron (daily at 08:00 UTC) ─────────────────
-- Requires pg_cron + pg_net extensions enabled on the Supabase project.
-- If the job already exists (from manual setup), the SELECT is a no-op.

SELECT cron.schedule(
  'notify-epi-alerts',
  '0 8 * * *',
  $$
    SELECT net.http_post(
      url     := (SELECT value FROM app_settings WHERE key = 'functions_url') || '/notify-epi-alerts',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
      ),
      body    := '{}'::jsonb
    );
  $$
) ON CONFLICT DO NOTHING;
