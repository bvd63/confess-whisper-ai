-- Fix user_badges conflicting RLS policies
-- Current state: Two contradictory policies exist
-- 1. "Users can only view their own badges" - restricts to owner
-- 2. "Users can view all user badges" - allows public access

-- Decision: Keep badges semi-public to allow viewing badges of followed users
-- but remove the overly permissive "view all" policy

DROP POLICY IF EXISTS "Users can view all user badges" ON user_badges;

-- Keep the existing policies that are properly scoped:
-- - "Users can only view their own badges" (for user's own badges)
-- - "Users can view badges of followed users" (for social features)

-- Add index to improve performance of the follow-based policy
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);

COMMENT ON TABLE user_badges IS 'User achievement badges - viewable by badge owner and their followers for social features';