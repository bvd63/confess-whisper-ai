-- Enhanced Authentication Security Tables

-- Sessions table for refresh token tracking with device metadata
CREATE TABLE IF NOT EXISTS public.auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  device_id TEXT,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_refreshed_at TIMESTAMPTZ DEFAULT now(),
  stay_connected BOOLEAN DEFAULT false
);

CREATE INDEX idx_auth_sessions_token_hash ON public.auth_sessions(token_hash);
CREATE INDEX idx_auth_sessions_user_id ON public.auth_sessions(user_id);
CREATE INDEX idx_auth_sessions_expires_at ON public.auth_sessions(expires_at) WHERE revoked_at IS NULL;

-- Enable RLS
ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for sessions
CREATE POLICY "Users can view their own sessions"
  ON public.auth_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
  ON public.auth_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON public.auth_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Failed login attempts tracking
CREATE TABLE IF NOT EXISTS public.failed_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  failure_reason TEXT
);

CREATE INDEX idx_failed_login_email ON public.failed_login_attempts(email, attempted_at DESC);
CREATE INDEX idx_failed_login_ip ON public.failed_login_attempts(ip_address, attempted_at DESC);
CREATE INDEX idx_failed_login_attempted_at ON public.failed_login_attempts(attempted_at DESC);

-- Enable RLS
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;

-- Only admins can view failed attempts
CREATE POLICY "Admins can view failed attempts"
  ON public.failed_login_attempts
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- CAPTCHA requirements tracking
CREATE TABLE IF NOT EXISTS public.captcha_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  required_until TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_captcha_requirements_email ON public.captcha_requirements(email);
CREATE INDEX idx_captcha_requirements_expires ON public.captcha_requirements(required_until);

-- Enable RLS
ALTER TABLE public.captcha_requirements ENABLE ROW LEVEL SECURITY;

-- Security events log
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_security_events_user_id ON public.security_events(user_id, created_at DESC);
CREATE INDEX idx_security_events_type ON public.security_events(event_type, created_at DESC);
CREATE INDEX idx_security_events_created_at ON public.security_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own security events
CREATE POLICY "Users can view their own security events"
  ON public.security_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all security events
CREATE POLICY "Admins can view all security events"
  ON public.security_events
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.auth_sessions
  WHERE expires_at < now() AND revoked_at IS NULL;
END;
$$;

-- Function to cleanup old failed attempts (keep 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_failed_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.failed_login_attempts
  WHERE attempted_at < now() - INTERVAL '30 days';
END;
$$;

-- Function to check if CAPTCHA is required for email
CREATE OR REPLACE FUNCTION public.is_captcha_required(_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.captcha_requirements
    WHERE email = _email
    AND required_until > now()
  );
$$;

-- Function to get failed login count for email
CREATE OR REPLACE FUNCTION public.get_failed_login_count(_email TEXT, _minutes INTEGER DEFAULT 15)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.failed_login_attempts
  WHERE email = _email
  AND attempted_at > now() - (_minutes || ' minutes')::INTERVAL;
$$;

-- Function to revoke all user sessions
CREATE OR REPLACE FUNCTION public.revoke_all_user_sessions(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.auth_sessions
  SET revoked_at = now()
  WHERE user_id = _user_id
  AND revoked_at IS NULL;
END;
$$;

-- Function to log security event
CREATE OR REPLACE FUNCTION public.log_security_event(
  _user_id UUID,
  _event_type TEXT,
  _event_data JSONB DEFAULT NULL,
  _ip_address TEXT DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_events (
    user_id,
    event_type,
    event_data,
    ip_address,
    user_agent
  ) VALUES (
    _user_id,
    _event_type,
    _event_data,
    _ip_address,
    _user_agent
  );
END;
$$;