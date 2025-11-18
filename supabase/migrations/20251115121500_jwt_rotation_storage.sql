-- JWT rotation + Turnstile hardening storage updates

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
  ) THEN
    EXECUTE 'CREATE EXTENSION pgcrypto';
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    -- Skip when the current role is not allowed to create extensions.
    NULL;
END;
$$;

-- Expand auth_sessions metadata for rotation tracking
ALTER TABLE public.auth_sessions
  ADD COLUMN IF NOT EXISTS stay_connected BOOLEAN DEFAULT false;

ALTER TABLE public.auth_sessions
  ADD COLUMN IF NOT EXISTS rotation_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.auth_sessions
  ADD COLUMN IF NOT EXISTS refresh_nonce UUID NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE public.auth_sessions
  ADD COLUMN IF NOT EXISTS anomaly_reason TEXT;

ALTER TABLE public.auth_sessions
  ADD COLUMN IF NOT EXISTS captcha_verified_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.auth_sessions
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Normalize null stay_connected values left by legacy rows
UPDATE public.auth_sessions
SET stay_connected = false
WHERE stay_connected IS NULL;

-- Indexes to keep refresh lookups fast
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_refresh_nonce ON public.auth_sessions(refresh_nonce);
CREATE INDEX IF NOT EXISTS idx_sessions_rotation_monitor ON public.auth_sessions(user_id, rotation_count);
CREATE INDEX IF NOT EXISTS idx_sessions_email ON public.auth_sessions(email);

-- Add additional metadata to captcha requirements for per-device enforcement
ALTER TABLE public.captcha_requirements
  ADD COLUMN IF NOT EXISTS device_id TEXT,
  ADD COLUMN IF NOT EXISTS ip_address TEXT;

CREATE INDEX IF NOT EXISTS idx_captcha_scope ON public.captcha_requirements(email, device_id, ip_address);

-- Helper to mark CAPTCHA as required for a subject
CREATE OR REPLACE FUNCTION public.mark_captcha_requirement(
  _email TEXT,
  _device_id TEXT DEFAULT NULL,
  _ip_address TEXT DEFAULT NULL,
  _reason TEXT DEFAULT 'manual',
  _lock_minutes INTEGER DEFAULT 30
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_email TEXT := lower(_email);
BEGIN
  INSERT INTO public.captcha_requirements (
    email,
    required_until,
    reason,
    device_id,
    ip_address
  ) VALUES (
    normalized_email,
    now() + ((_lock_minutes || ' minutes')::interval),
    _reason,
    _device_id,
    _ip_address
  )
  ON CONFLICT (email) DO UPDATE
    SET required_until = EXCLUDED.required_until,
        reason = EXCLUDED.reason,
        device_id = COALESCE(EXCLUDED.device_id, public.captcha_requirements.device_id),
        ip_address = COALESCE(EXCLUDED.ip_address, public.captcha_requirements.ip_address);
END;
$$;

-- Helper to clear CAPTCHA requirement once user passes Turnstile
CREATE OR REPLACE FUNCTION public.clear_captcha_requirement(
  _email TEXT,
  _device_id TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_email TEXT := lower(_email);
BEGIN
  DELETE FROM public.captcha_requirements
  WHERE email = normalized_email
    AND (_device_id IS NULL OR device_id IS NULL OR device_id = _device_id);
END;
$$;
