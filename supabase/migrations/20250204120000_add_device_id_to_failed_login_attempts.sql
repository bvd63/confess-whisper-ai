DO $$
BEGIN
  IF to_regclass('public.failed_login_attempts') IS NOT NULL THEN
    ALTER TABLE public.failed_login_attempts
      ADD COLUMN IF NOT EXISTS device_id TEXT;

    CREATE INDEX IF NOT EXISTS idx_failed_attempts_device
      ON public.failed_login_attempts(device_id, attempted_at DESC);

    CREATE INDEX IF NOT EXISTS idx_failed_attempts_ip_device
      ON public.failed_login_attempts(ip_address, device_id, attempted_at DESC);
  END IF;
END;
$$;
