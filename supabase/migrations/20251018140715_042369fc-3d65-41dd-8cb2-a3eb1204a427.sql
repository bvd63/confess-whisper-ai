-- Add performance-critical indexes for ConfessAI

-- Confessions table indexes
CREATE INDEX IF NOT EXISTS idx_confessions_location 
ON confessions (location_lat, location_lng) 
WHERE location_enabled = true;

CREATE INDEX IF NOT EXISTS idx_confessions_community 
ON confessions (community_id, created_at DESC) 
WHERE moderation_status = 'approved' AND is_draft = false;

CREATE INDEX IF NOT EXISTS idx_confessions_user_status 
ON confessions (user_id, moderation_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_confessions_category_status 
ON confessions (category, moderation_status, created_at DESC) 
WHERE is_draft = false;

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
ON notifications (user_id, created_at DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_unread 
ON notifications (user_id, is_read, created_at DESC) 
WHERE deleted_at IS NULL;

-- User follows indexes  
CREATE INDEX IF NOT EXISTS idx_user_follows_follower 
ON user_follows (follower_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_follows_following 
ON user_follows (following_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_follows_composite 
ON user_follows (follower_id, following_id);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON messages (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_unread 
ON messages (conversation_id, is_read) 
WHERE is_read = false;

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_confession_created 
ON comments (confession_id, created_at DESC);

-- User likes indexes
CREATE INDEX IF NOT EXISTS idx_user_likes_user 
ON user_likes (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_likes_confession 
ON user_likes (confession_id);

-- Bookmarks indexes
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_created 
ON bookmarks (user_id, created_at DESC);

-- Community members indexes
CREATE INDEX IF NOT EXISTS idx_community_members_user 
ON community_members (user_id, joined_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_members_community_role 
ON community_members (community_id, role, joined_at DESC);

-- Analytics events indexes
CREATE INDEX IF NOT EXISTS idx_analytics_user_date 
ON analytics_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_event_type_date 
ON analytics_events (event_type, created_at DESC);

-- Add query timeout to prevent runaway queries
ALTER DATABASE postgres SET statement_timeout = '30s';

-- Analyze tables to update statistics
ANALYZE confessions;
ANALYZE notifications;
ANALYZE messages;
ANALYZE user_follows;
ANALYZE comments;
ANALYZE user_likes;
ANALYZE bookmarks;
ANALYZE community_members;
ANALYZE analytics_events;