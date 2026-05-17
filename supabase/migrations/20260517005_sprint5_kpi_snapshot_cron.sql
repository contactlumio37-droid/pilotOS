-- Sprint 5 — Schedule kpi-snapshot Edge Function via pg_cron
-- Runs daily at 23:00 UTC — captures latest indicator values into kpi_snapshots
-- Feeds the BI Hub (BIHubPage) with historical KPI trend data.

DO $$
BEGIN
  PERFORM cron.schedule(
    'kpi-daily-snapshot',
    '0 23 * * *',
    $cmd$
      SELECT net.http_post(
        url     := (SELECT value FROM app_settings WHERE key = 'functions_url') || '/kpi-snapshot',
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
