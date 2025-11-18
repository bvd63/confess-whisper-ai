-- RLS + security hardening across Supabase tables

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'auth_sessions'
      AND policyname = 'Users can update their own sessions'
  ) THEN
    EXECUTE format(
      'ALTER POLICY %I ON public.auth_sessions USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);',
      'Users can update their own sessions'
    );
  END IF;
END;
$$;

-- Allow authenticated users to revoke their own sessions via DELETE
DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.auth_sessions;
CREATE POLICY "Users can delete their own sessions"
  ON public.auth_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Normalize emails before writing to security tables to avoid bypassing unique constraints
CREATE OR REPLACE FUNCTION public.normalize_email_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    NEW.email := lower(NEW.email);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_failed_login_normalize_email ON public.failed_login_attempts;
CREATE TRIGGER trg_failed_login_normalize_email
BEFORE INSERT OR UPDATE ON public.failed_login_attempts
FOR EACH ROW
EXECUTE FUNCTION public.normalize_email_before_write();

DROP TRIGGER IF EXISTS trg_captcha_requirements_normalize_email ON public.captcha_requirements;
CREATE TRIGGER trg_captcha_requirements_normalize_email
BEFORE INSERT OR UPDATE ON public.captcha_requirements
FOR EACH ROW
EXECUTE FUNCTION public.normalize_email_before_write();

-- Helper RPC exposing a concise health snapshot for service-role automation
CREATE OR REPLACE FUNCTION public.get_security_health_snapshot()
RETURNS TABLE (
  active_sessions BIGINT,
  captcha_locks BIGINT,
  failed_logins_24h BIGINT,
  security_events_24h BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_role TEXT := current_setting('request.jwt.claim.role', true);
BEGIN
  IF requester_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.auth_sessions WHERE revoked_at IS NULL AND expires_at > now()),
    (SELECT COUNT(*) FROM public.captcha_requirements WHERE required_until > now()),
    (SELECT COUNT(*) FROM public.failed_login_attempts WHERE attempted_at > now() - INTERVAL '24 hours'),
    (SELECT COUNT(*) FROM public.security_events WHERE created_at > now() - INTERVAL '24 hours');
END;
$$;
