-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create cron job to rotate Quote of the Day every day at midnight UTC
SELECT cron.schedule(
  'rotate-qotd-daily',
  '0 0 * * *', -- Every day at midnight UTC
  $$
  SELECT
    net.http_post(
        url := current_setting('app.settings.supabase_url', true) || '/functions/v1/rotate-qotd',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-internal-secret', current_setting('app.settings.internal_job_secret', true)
        ),
        body:='{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);

-- Create cron job to cleanup old soft-deleted records every day at 2 AM UTC
SELECT cron.schedule(
  'cleanup-soft-deletes-daily',
  '0 2 * * *', -- Every day at 2 AM UTC
  $$
  SELECT
    net.http_post(
        url := current_setting('app.settings.supabase_url', true) || '/functions/v1/cleanup-soft-deletes',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-internal-secret', current_setting('app.settings.internal_job_secret', true)
        ),
        body:='{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);