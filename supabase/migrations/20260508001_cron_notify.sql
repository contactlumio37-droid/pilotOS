-- pg_cron: Daily late-actions notifications at 8:00 UTC
-- pg_cron: Weekly digest on Monday 7:00 UTC
-- Note: pg_cron extension must be enabled in the Supabase project dashboard

-- Enable extension if not already present (requires superuser in managed env)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Daily: mark late actions + send notifications
SELECT cron.schedule(
  'notify-late-actions-daily',
  '0 8 * * *',  -- every day at 08:00 UTC
  $$
    SELECT net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/notify-late-actions',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);

-- Weekly digest: every Monday at 07:00 UTC
SELECT cron.schedule(
  'notify-weekly-digest',
  '0 7 * * 1',  -- every Monday at 07:00 UTC
  $$
    SELECT net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/notify-weekly-digest',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);
