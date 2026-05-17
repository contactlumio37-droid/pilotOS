-- Sprint 8 — Schedule notify-due-soon Edge Function via pg_cron
-- Runs daily at 08:00 UTC — sends J-2 reminders for actions due in 2 days.

DO $$
BEGIN
  PERFORM cron.schedule(
    'notify-due-soon-daily',
    '0 8 * * *',
    $cmd$
      SELECT net.http_post(
        url     := (SELECT value FROM app_settings WHERE key = 'functions_url') || '/notify-due-soon',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
        ),
        body    := '{}'::jsonb
      );
    $cmd$
  );
EXCEPTION WHEN unique_violation THEN
  NULL;
END;
$$;
