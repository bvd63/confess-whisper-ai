-- Create table for persistent rate limiting
-- Replaces in-memory Map storage which doesn't scale across edge function instances

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON rate_limits(reset_at);

-- Enable RLS but make it permissive since this is internal system table
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow edge functions (service role) to manage rate limits
CREATE POLICY "Service role can manage rate limits"
ON rate_limits FOR ALL
USING (true)
WITH CHECK (true);

COMMENT ON TABLE rate_limits IS 'Persistent storage for rate limiting - shared across all edge function instances';

-- Function to clean up expired rate limit entries (call from cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rate_limits WHERE reset_at < NOW();
END;
$$;