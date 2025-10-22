-- Add last_equipped_at column to user_flairs to track cooldown
ALTER TABLE user_flairs 
ADD COLUMN last_equipped_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for better performance when checking cooldowns
CREATE INDEX idx_user_flairs_last_equipped ON user_flairs(user_id, last_equipped_at) WHERE last_equipped_at IS NOT NULL;

-- Add comment to explain the field
COMMENT ON COLUMN user_flairs.last_equipped_at IS 'Timestamp of last time this flair was equipped. Used for VIP flair cooldown (5 days)';