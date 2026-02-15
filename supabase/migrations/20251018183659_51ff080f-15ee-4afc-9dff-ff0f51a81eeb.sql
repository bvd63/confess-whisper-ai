-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule quote rotation every day at midnight UTC
SELECT cron.schedule(
  'rotate-daily-quote',
  '0 0 * * *',
  $$
  SELECT
    net.http_post(
        url := current_setting('app.settings.supabase_url', true) || '/functions/v1/rotate-qotd',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-internal-secret', current_setting('app.settings.internal_job_secret', true)
        ),
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Schedule cleanup of old soft-deleted records every week (Sunday at 2 AM UTC)
SELECT cron.schedule(
  'cleanup-soft-deletes-weekly',
  '0 2 * * 0',
  $$
  SELECT
    net.http_post(
        url := current_setting('app.settings.supabase_url', true) || '/functions/v1/cleanup-soft-deletes',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-internal-secret', current_setting('app.settings.internal_job_secret', true)
        ),
        body:='{"days": 30}'::jsonb
    ) as request_id;
  $$
);

-- Schedule materialized view refresh every hour
SELECT cron.schedule(
  'refresh-trending-confessions',
  '0 * * * *',
  $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY trending_confessions;
  $$
);

-- Create a cron monitoring table
CREATE TABLE IF NOT EXISTS cron_job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on cron_job_logs
ALTER TABLE cron_job_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view cron logs
CREATE POLICY "Admins can view cron logs"
  ON cron_job_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));