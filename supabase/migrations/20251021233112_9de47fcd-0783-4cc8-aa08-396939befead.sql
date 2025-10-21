-- Fix is_badge_active function search_path
CREATE OR REPLACE FUNCTION public.is_badge_active(acquired_at TIMESTAMP WITH TIME ZONE, expires_at TIMESTAMP WITH TIME ZONE)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = 'public'
AS $$
  SELECT expires_at IS NULL OR expires_at > NOW();
$$;