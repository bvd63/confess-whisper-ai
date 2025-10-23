-- Performance Optimization Indexes
-- Created: 2025-10-23
-- Purpose: Improve query performance for common operations

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
ON profiles(last_active DESC, karma_points DESC)
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
ON comments(confession_id, parent_id, created_at DESC)
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
INCLUDE (likes_count, replies_count, views_count, category)
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
ON confession_likes(user_id, confession_id);

-- Optimizes: Getting all likes for a confession
CREATE INDEX IF NOT EXISTS idx_confession_likes_confession 
ON confession_likes(confession_id, created_at DESC);

-- ============================================
-- NOTIFICATIONS INDEX
-- ============================================
-- Optimizes: User notifications feed
CREATE INDEX IF NOT EXISTS idx_notifications_user 
ON notifications(user_id, read, created_at DESC)
WHERE deleted_at IS NULL;

-- ============================================
-- SUBSCRIPTION STATUS INDEX
-- ============================================
-- Optimizes: Checking premium status
CREATE INDEX IF NOT EXISTS idx_profiles_subscription 
ON profiles(subscription_tier, subscription_status, subscription_ends_at)
WHERE deleted_at IS NULL;

-- ============================================
-- PERFORMANCE ANALYSIS
-- ============================================
-- Enable pg_stat_statements for query analysis (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View for monitoring slow queries
CREATE OR REPLACE VIEW v_slow_queries AS
SELECT 
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time,
  stddev_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100 -- Queries slower than 100ms on average
ORDER BY mean_exec_time DESC
LIMIT 50;

-- ============================================
-- INDEX USAGE MONITORING
-- ============================================
-- View for monitoring index usage
CREATE OR REPLACE VIEW v_index_usage AS
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- ============================================
-- MAINTENANCE
-- ============================================
-- Note: Run VACUUM ANALYZE periodically to update statistics
-- VACUUM ANALYZE confessions;
-- VACUUM ANALYZE comments;
-- VACUUM ANALYZE profiles;
