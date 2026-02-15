-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the deactivate-expired-flairs function to run daily at 2 AM
SELECT cron.schedule(
  'deactivate-expired-flairs-daily',
  '0 2 * * *', -- Run at 2 AM every day
  $$
  SELECT
    net.http_post(
        url := current_setting('app.settings.supabase_url', true) || '/functions/v1/deactivate-expired-flairs',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-internal-secret', current_setting('app.settings.internal_job_secret', true)
        ),
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);