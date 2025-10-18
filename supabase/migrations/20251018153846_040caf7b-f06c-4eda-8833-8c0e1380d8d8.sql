-- Add index for app_state key lookups (for quote of the day)
CREATE INDEX IF NOT EXISTS idx_app_state_key ON app_state(key);

-- Add index for profiles user_id lookup (for premium status and follow stats)
-- This should already exist but let's ensure it's there
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- Add index for user_follows queries (for follow status checks)
CREATE INDEX IF NOT EXISTS idx_user_follows_follower_following ON user_follows(follower_id, following_id);

-- Add index for confessions with filtering
CREATE INDEX IF NOT EXISTS idx_confessions_status_created ON confessions(moderation_status, created_at DESC) 
WHERE moderation_status = 'approved' AND is_draft = false AND is_private = false;