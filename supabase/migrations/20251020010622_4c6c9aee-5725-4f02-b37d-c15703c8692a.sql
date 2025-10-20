-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the deactivate-expired-flairs function to run daily at 2 AM
SELECT cron.schedule(
  'deactivate-expired-flairs-daily',
  '0 2 * * *', -- Run at 2 AM every day
  $$
  SELECT
    net.http_post(
        url:='https://fxwvlbopvnjjjrzshqvw.supabase.co/functions/v1/deactivate-expired-flairs',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4d3ZsYm9wdm5qampyenNocXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1Mjg3ODQsImV4cCI6MjA3NjEwNDc4NH0.BXOtdXXS8PvqZSVcksyCuqNW0ebJ7nE58-CKSnSPk4Q"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);