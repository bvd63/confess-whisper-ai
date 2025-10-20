-- Drop existing tables if they have incorrect schema
DROP TABLE IF EXISTS public.auth_sessions CASCADE;
DROP TABLE IF EXISTS public.failed_login_attempts CASCADE;
DROP TABLE IF EXISTS public.captcha_requirements CASCADE;
DROP TABLE IF EXISTS public.security_events CASCADE;

-- Failed login attempts tracking
CREATE TABLE public.failed_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_failed_attempts_email ON public.failed_login_attempts(email, attempted_at);
CREATE INDEX idx_failed_attempts_ip ON public.failed_login_attempts(ip_address, attempted_at);

-- CAPTCHA requirements tracking
CREATE TABLE public.captcha_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  required_until TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_captcha_email ON public.captcha_requirements(email, required_until);

-- Auth sessions with device tracking
CREATE TABLE public.auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  device_id TEXT,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_refreshed_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_sessions_user ON public.auth_sessions(user_id);
CREATE INDEX idx_sessions_token ON public.auth_sessions(refresh_token_hash);
CREATE INDEX idx_sessions_device ON public.auth_sessions(device_id);

-- Security events log
CREATE TABLE public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_security_events_user ON public.security_events(user_id, created_at);
CREATE INDEX idx_security_events_type ON public.security_events(event_type, created_at);

-- Enable RLS
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captcha_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own sessions"
  ON public.auth_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own security events"
  ON public.security_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to failed_attempts"
  ON public.failed_login_attempts FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to captcha"
  ON public.captcha_requirements FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to sessions"
  ON public.auth_sessions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to security_events"
  ON public.security_events FOR ALL
  USING (auth.role() = 'service_role');