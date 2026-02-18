-- Add device tracking to failed login attempts for improved rate limiting
DO $$
BEGIN
  IF to_regclass('public.failed_login_attempts') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.failed_login_attempts ADD COLUMN IF NOT EXISTS device_id TEXT';

    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_failed_attempts_device ON public.failed_login_attempts(device_id, attempted_at DESC)';

    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_failed_attempts_ip_device ON public.failed_login_attempts(ip_address, device_id, attempted_at DESC)';
  END IF;
END
$$;
