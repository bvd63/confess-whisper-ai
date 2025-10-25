-- Fix old flairs with NULL expires_at to have a proper expiry date
-- Set expires_at to 30 days from now for all NULL entries
UPDATE user_flairs
SET expires_at = NOW() + INTERVAL '30 days'
WHERE expires_at IS NULL;

-- Add a default value for expires_at in future inserts (via trigger is better)
-- This ensures all new flairs have expiry dates