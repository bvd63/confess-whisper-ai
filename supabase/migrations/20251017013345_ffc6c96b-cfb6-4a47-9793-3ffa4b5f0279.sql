-- Phase 1: Database Performance & Infrastructure

-- 1. Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_confessions_created_at_desc 
ON confessions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_confessions_user_created 
ON confessions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_confession_created 
ON comments (confession_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON messages (conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
ON notifications (user_id, created_at DESC) 
WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_user_follows_follower 
ON user_follows (follower_id);

CREATE INDEX IF NOT EXISTS idx_user_follows_following 
ON user_follows (following_id);

-- 2. Full-text search indexes for EN/ES/DE
CREATE INDEX IF NOT EXISTS idx_confessions_content_fulltext 
ON confessions USING gin(to_tsvector('english', content));

CREATE INDEX IF NOT EXISTS idx_confessions_content_spanish 
ON confessions USING gin(to_tsvector('spanish', content));

CREATE INDEX IF NOT EXISTS idx_confessions_content_german 
ON confessions USING gin(to_tsvector('german', content));

-- 3. Materialized view for hot confessions (trending algorithm)
CREATE MATERIALIZED VIEW IF NOT EXISTS hot_confessions AS
SELECT 
  c.*,
  (
    log(GREATEST(c.likes_count, 1)) * 10 +
    log(GREATEST(c.comments_count, 1)) * 5 +
    log(GREATEST(c.shared_count, 1)) * 3 +
    EXTRACT(EPOCH FROM (NOW() - c.created_at)) / -3600
  ) AS hot_score
FROM confessions c
WHERE 
  c.moderation_status = 'approved'
  AND c.is_private = false
  AND c.created_at > NOW() - INTERVAL '7 days'
ORDER BY hot_score DESC
LIMIT 100;

CREATE UNIQUE INDEX IF NOT EXISTS idx_hot_confessions_id 
ON hot_confessions (id);

-- 4. Add AI usage tracking table
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'basic_reply', 'deep_insight', 'moderation'
  tokens_used INTEGER DEFAULT 0,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_created 
ON ai_usage (user_id, created_at DESC);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI usage"
ON ai_usage FOR SELECT
USING (auth.uid() = user_id);

-- 5. Add moderation queue table
CREATE TABLE IF NOT EXISTS moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confession_id UUID REFERENCES confessions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  moderation_level TEXT NOT NULL CHECK (moderation_level IN ('safe', 'borderline', 'unsafe')),
  ai_reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moderation_queue_status 
ON moderation_queue (status, created_at DESC);

ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Moderators can view queue"
ON moderation_queue FOR SELECT
USING (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can update queue"
ON moderation_queue FOR UPDATE
USING (has_role(auth.uid(), 'moderator') OR has_role(auth.uid(), 'admin'));

-- 6. Add function to refresh hot confessions
CREATE OR REPLACE FUNCTION refresh_hot_confessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY hot_confessions;
END;
$$;

-- 7. Add subscription entitlements table for Stripe
CREATE TABLE IF NOT EXISTS subscription_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'basic', 'premium', 'enterprise')),
  ai_insights_quota INTEGER DEFAULT 5,
  ai_insights_used INTEGER DEFAULT 0,
  features JSONB DEFAULT '{}'::jsonb,
  stripe_subscription_id TEXT,
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_entitlements_user 
ON subscription_entitlements (user_id);

ALTER TABLE subscription_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their entitlements"
ON subscription_entitlements FOR SELECT
USING (auth.uid() = user_id);

-- 8. Add trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_subscription_entitlements_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_subscription_entitlements_updated_at
BEFORE UPDATE ON subscription_entitlements
FOR EACH ROW
EXECUTE FUNCTION update_subscription_entitlements_updated_at();