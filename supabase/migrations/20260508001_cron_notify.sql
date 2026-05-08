-- pg_cron: Daily late-actions notifications at 8:00 UTC
-- pg_cron: Weekly digest on Monday 7:00 UTC
--
-- ⚠️  pg_cron must be enabled manually in the Supabase dashboard
--     (Database → Extensions → pg_cron) before cron jobs take effect.
--     This migration is safe to apply without it — jobs are silently skipped
--     and a WARNING is emitted. Re-run or register jobs manually once enabled.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN

    -- Daily: mark late actions + send notifications (every day at 08:00 UTC)
    PERFORM cron.schedule(
      'notify-late-actions-daily',
      '0 8 * * *',
      $job$
        SELECT net.http_post(
          url := current_setting('app.supabase_url') || '/functions/v1/notify-late-actions',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.service_role_key')
          ),
          body := '{}'::jsonb
        );
      $job$
    );

    -- Weekly digest (every Monday at 07:00 UTC)
    PERFORM cron.schedule(
      'notify-weekly-digest',
      '0 7 * * 1',
      $job$
        SELECT net.http_post(
          url := current_setting('app.supabase_url') || '/functions/v1/notify-weekly-digest',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.service_role_key')
          ),
          body := '{}'::jsonb
        );
      $job$
    );

    RAISE NOTICE 'pg_cron jobs registered successfully.';

  ELSE
    RAISE WARNING 'pg_cron extension not found — cron jobs skipped. Enable it in the Supabase dashboard under Database → Extensions → pg_cron, then re-run this migration or register the jobs manually.';
  END IF;
END;
$$;
