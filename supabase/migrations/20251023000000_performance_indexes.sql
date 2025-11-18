-- Performance Optimization Indexes
-- Created: 2025-10-23
-- Purpose: Improve query performance for common operations

-- Ensure soft delete columns exist for partial indexes
ALTER TABLE public.confessions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================
-- TRENDING CONFESSIONS INDEX
-- ============================================
-- Optimizes: Home page trending feed, hot confessions
CREATE INDEX IF NOT EXISTS idx_confessions_trending 
ON confessions(created_at DESC, likes_count DESC, views_count DESC) 
WHERE deleted_at IS NULL AND moderation_status = 'approved';

-- ============================================
-- USER ACTIVITY INDEX
-- ============================================
-- Optimizes: User profile queries, leaderboards
CREATE INDEX IF NOT EXISTS idx_user_activity 
ON profiles(posts_count DESC, followers_count DESC)
WHERE deleted_at IS NULL;

-- ============================================
-- CATEGORY FILTER INDEX
-- ============================================
-- Optimizes: Category browsing, filtered feeds
CREATE INDEX IF NOT EXISTS idx_confessions_category 
ON confessions(category, created_at DESC, likes_count DESC) 
WHERE deleted_at IS NULL AND moderation_status = 'approved';

-- ============================================
-- FULL-TEXT SEARCH INDEX
-- ============================================
-- Optimizes: Search functionality
CREATE INDEX IF NOT EXISTS idx_confessions_search 
ON confessions USING gin(to_tsvector('english', content))
WHERE deleted_at IS NULL;

-- Add search index for Spanish content
CREATE INDEX IF NOT EXISTS idx_confessions_search_es 
ON confessions USING gin(to_tsvector('spanish', content))
WHERE deleted_at IS NULL;

-- Add search index for German content
CREATE INDEX IF NOT EXISTS idx_confessions_search_de 
ON confessions USING gin(to_tsvector('german', content))
WHERE deleted_at IS NULL;

-- ============================================
-- COMMENT THREADS INDEX
-- ============================================
-- Optimizes: Loading comment threads, replies
CREATE INDEX IF NOT EXISTS idx_comments_thread 
ON comments(confession_id, created_at DESC)
WHERE deleted_at IS NULL;

-- ============================================
-- USER CONFESSIONS INDEX
-- ============================================
-- Optimizes: User profile page, "my confessions"
CREATE INDEX IF NOT EXISTS idx_confessions_by_user 
ON confessions(user_id, created_at DESC)
WHERE deleted_at IS NULL;

-- ============================================
-- ANALYTICS QUERIES INDEX
-- ============================================
-- Optimizes: Dashboard analytics, statistics
CREATE INDEX IF NOT EXISTS idx_confession_analytics 
ON confessions(user_id, created_at DESC) 
INCLUDE (likes_count, comments_count, views_count, category)
WHERE deleted_at IS NULL;

-- ============================================
-- MODERATION QUEUE INDEX
-- ============================================
-- Optimizes: Moderation panel queries
CREATE INDEX IF NOT EXISTS idx_confessions_moderation 
ON confessions(moderation_status, created_at DESC)
WHERE deleted_at IS NULL;

-- ============================================
-- LIKES/VOTES INDEX
-- ============================================
-- Optimizes: Checking if user has liked a confession
CREATE INDEX IF NOT EXISTS idx_confession_likes_user 
ON user_likes(user_id, confession_id);

-- Optimizes: Getting all likes for a confession
CREATE INDEX IF NOT EXISTS idx_confession_likes_confession 
ON user_likes(confession_id, created_at DESC);

-- ============================================
-- NOTIFICATIONS INDEX
-- ============================================
-- Optimizes: User notifications feed
CREATE INDEX IF NOT EXISTS idx_notifications_user 
ON notifications(user_id, is_read, created_at DESC)
WHERE deleted_at IS NULL;

-- ============================================
-- SUBSCRIPTION STATUS INDEX
-- ============================================
-- Optimizes: Checking premium status
CREATE INDEX IF NOT EXISTS idx_profiles_subscription 
ON profiles(subscription_tier, subscription_status, subscription_ends_at)
WHERE deleted_at IS NULL;

-- ============================================
-- MAINTENANCE
-- ============================================
-- Note: Run VACUUM ANALYZE periodically to update statistics
-- VACUUM ANALYZE confessions;
-- VACUUM ANALYZE comments;
-- VACUUM ANALYZE profiles;
