-- Critical indexes for <200ms query performance
-- Confessions indexes
CREATE INDEX IF NOT EXISTS idx_confessions_created_at ON confessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_confessions_likes_count ON confessions(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_confessions_user_id ON confessions(user_id);
CREATE INDEX IF NOT EXISTS idx_confessions_category ON confessions(category);
CREATE INDEX IF NOT EXISTS idx_confessions_moderation_status ON confessions(moderation_status);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_confession_id ON comments(confession_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read_status ON notifications(user_id, is_read);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- Conversation participants index
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id);

-- User follows indexes
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_handle ON profiles(handle);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_confessions_user_status ON confessions(user_id, moderation_status) WHERE is_draft = false;
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, is_read, created_at DESC);