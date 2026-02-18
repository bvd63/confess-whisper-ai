-- Performance Optimization Indexes
-- Created: 2025-10-23
-- Purpose: Improve query performance for common operations

-- ============================================
-- TRENDING CONFESSIONS INDEX
-- ============================================
-- Optimizes: Home page trending feed, hot confessions
DO $$
BEGIN
  IF to_regclass('public.confessions') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'confessions'
         AND column_name = 'deleted_at'
     )
  THEN
    EXECUTE $idx$
      CREATE INDEX IF NOT EXISTS idx_confessions_trending
      ON confessions(created_at DESC, likes_count DESC, views_count DESC)
      WHERE deleted_at IS NULL AND moderation_status = 'approved'
    $idx$;
  END IF;
END
$$;

-- ============================================
-- USER ACTIVITY INDEX
-- ============================================
-- Optimizes: User profile queries, leaderboards
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'profiles'
         AND column_name = 'deleted_at'
     )
  THEN
    EXECUTE $idx$
      CREATE INDEX IF NOT EXISTS idx_user_activity
      ON profiles(last_active DESC, karma_points DESC)
      WHERE deleted_at IS NULL
    $idx$;
  END IF;
END
$$;

-- ============================================
-- CATEGORY FILTER INDEX
-- ============================================
-- Optimizes: Category browsing, filtered feeds
DO $$
BEGIN
  IF to_regclass('public.confessions') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'confessions'
         AND column_name = 'deleted_at'
     )
  THEN
    EXECUTE $idx$
      CREATE INDEX IF NOT EXISTS idx_confessions_category
      ON confessions(category, created_at DESC, likes_count DESC)
      WHERE deleted_at IS NULL AND moderation_status = 'approved'
    $idx$;
  END IF;
END
$$;

-- ============================================
-- FULL-TEXT SEARCH INDEX
-- ============================================
-- Optimizes: Search functionality
DO $$
BEGIN
  IF to_regclass('public.confessions') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'confessions'
         AND column_name = 'deleted_at'
     )
  THEN
    EXECUTE $idx$
      CREATE INDEX IF NOT EXISTS idx_confessions_search
      ON confessions USING gin(to_tsvector('english', content))
      WHERE deleted_at IS NULL
    $idx$;
  END IF;
END
$$;

-- Add search index for Spanish content
DO $$
BEGIN
  IF to_regclass('public.confessions') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'confessions'
         AND column_name = 'deleted_at'
     )
  THEN
    EXECUTE $idx$
      CREATE INDEX IF NOT EXISTS idx_confessions_search_es
      ON confessions USING gin(to_tsvector('spanish', content))
      WHERE deleted_at IS NULL
    $idx$;
  END IF;
END
$$;

-- Add search index for German content
DO $$
BEGIN
  IF to_regclass('public.confessions') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'confessions'
         AND column_name = 'deleted_at'
     )
  THEN
    EXECUTE $idx$
      CREATE INDEX IF NOT EXISTS idx_confessions_search_de
      ON confessions USING gin(to_tsvector('german', content))
      WHERE deleted_at IS NULL
    $idx$;
  END IF;
END
$$;

-- ============================================
-- COMMENT THREADS INDEX
-- ============================================
-- Optimizes: Loading comment threads, replies
DO $$
BEGIN
  IF to_regclass('public.comments') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'comments'
         AND column_name = 'deleted_at'
     )
  THEN
    EXECUTE $idx$
      CREATE INDEX IF NOT EXISTS idx_comments_thread
      ON comments(confession_id, parent_id, created_at DESC)
      WHERE deleted_at IS NULL
    $idx$;
  END IF;
END
$$;

-- ============================================
-- USER CONFESSIONS INDEX
-- ============================================
-- Optimizes: User profile page, "my confessions"
DO $$
BEGIN
  IF to_regclass('public.confessions') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'confessions'
         AND column_name = 'deleted_at'
     )
  THEN
    EXECUTE $idx$
      CREATE INDEX IF NOT EXISTS idx_confessions_by_user
      ON confessions(user_id, created_at DESC)
      WHERE deleted_at IS NULL
    $idx$;
  END IF;
END
$$;

-- ============================================
-- ANALYTICS QUERIES INDEX
-- ============================================
-- Optimizes: Dashboard analytics, statistics
DO $$
BEGIN
  IF to_regclass('public.confessions') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'confessions'
         AND column_name = 'deleted_at'
     )
  THEN
    EXECUTE $idx$
      CREATE INDEX IF NOT EXISTS idx_confession_analytics
      ON confessions(user_id, created_at DESC)
      INCLUDE (likes_count, replies_count, views_count, category)
      WHERE deleted_at IS NULL
    $idx$;
  END IF;
END
$$;

-- ============================================
-- MODERATION QUEUE INDEX
-- ============================================
-- Optimizes: Moderation panel queries
DO $$
BEGIN
  IF to_regclass('public.confessions') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'confessions'
         AND column_name = 'deleted_at'
     )
  THEN
    EXECUTE $idx$
      CREATE INDEX IF NOT EXISTS idx_confessions_moderation
      ON confessions(moderation_status, created_at DESC)
      WHERE deleted_at IS NULL
    $idx$;
  END IF;
END
$$;

-- ============================================
-- LIKES/VOTES INDEX (guarded)
-- ============================================
DO $$
BEGIN
  IF to_regclass('public.confession_likes') IS NOT NULL THEN
    -- Optimizes: Checking if user has liked a confession
    EXECUTE $idx$
      CREATE INDEX IF NOT EXISTS idx_confession_likes_user
      ON public.confession_likes(user_id, confession_id)
    $idx$;

    -- Optimizes: Getting all likes for a confession
    EXECUTE $idx$
      CREATE INDEX IF NOT EXISTS idx_confession_likes_confession
      ON public.confession_likes(confession_id, created_at DESC)
    $idx$;
  END IF;
END
$$;

-- ============================================
-- NOTIFICATIONS INDEX
-- ============================================
DO $$
BEGIN
  IF to_regclass('public.notifications') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'user_id'
     )
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'read'
     )
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'created_at'
     )
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'deleted_at'
     )
  THEN
    EXECUTE $idx$
      CREATE INDEX IF NOT EXISTS idx_notifications_user
      ON public.notifications(user_id, "read", created_at DESC)
      WHERE deleted_at IS NULL
    $idx$;
  END IF;
END
$$;

-- ============================================
-- SUBSCRIPTION STATUS INDEX
-- ============================================
-- Optimizes: Checking premium status
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'profiles'
         AND column_name = 'deleted_at'
     )
  THEN
    EXECUTE $idx$
      CREATE INDEX IF NOT EXISTS idx_profiles_subscription
      ON profiles(subscription_tier, subscription_status, subscription_ends_at)
      WHERE deleted_at IS NULL
    $idx$;
  END IF;
END
$$;

-- ============================================
-- PERFORMANCE ANALYSIS
-- ============================================
-- View for monitoring slow queries
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements')
     AND (
       to_regclass('public.pg_stat_statements') IS NOT NULL
       OR to_regclass('pg_catalog.pg_stat_statements') IS NOT NULL
     )
  THEN
    EXECUTE $view$
      CREATE OR REPLACE VIEW v_slow_queries AS
      SELECT
        query,
        calls,
        total_exec_time,
        mean_exec_time,
        max_exec_time,
        stddev_exec_time
      FROM pg_stat_statements
      WHERE mean_exec_time > 100
      ORDER BY mean_exec_time DESC
      LIMIT 50
    $view$;
  END IF;
END
$$;

-- ============================================
-- INDEX USAGE MONITORING
-- ============================================
-- View for monitoring index usage
CREATE OR REPLACE VIEW v_index_usage AS
SELECT 
  schemaname,
  relname as tablename,
  indexrelname as indexname,
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
