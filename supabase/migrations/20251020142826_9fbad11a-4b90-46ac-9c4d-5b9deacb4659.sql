-- Set up cron job for cleaning up expired auth data
-- This runs daily at 3 AM UTC

SELECT cron.schedule(
  'cleanup-auth-data-daily',
  '0 3 * * *', -- Daily at 3 AM UTC
  $$
  SELECT
    net.http_post(
        url := current_setting('app.settings.supabase_url', true) || '/functions/v1/cleanup-auth-data',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-internal-secret', current_setting('app.settings.internal_job_secret', true)
        ),
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Create a function to manually trigger cleanup (for testing)
CREATE OR REPLACE FUNCTION public.trigger_auth_cleanup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Clean up expired sessions
  DELETE FROM auth_sessions 
  WHERE expires_at < now() 
  AND revoked_at IS NULL;
  
  -- Clean up old failed attempts (30+ days)
  DELETE FROM failed_login_attempts 
  WHERE attempted_at < now() - interval '30 days';
  
  -- Clean up expired CAPTCHA requirements
  DELETE FROM captcha_requirements 
  WHERE required_until < now();
  
  -- Clean up old security events (90+ days)
  DELETE FROM security_events 
  WHERE created_at < now() - interval '90 days';
  
  result := jsonb_build_object(
    'success', true,
    'message', 'Cleanup completed successfully'
  );
  
  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.trigger_auth_cleanup IS 'Manually trigger authentication data cleanup for testing purposes';