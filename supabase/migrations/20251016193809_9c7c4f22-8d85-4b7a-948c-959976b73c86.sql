-- Add performance indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_confessions_created_at ON public.confessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_confessions_likes_count ON public.confessions(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_confessions_category ON public.confessions(category);
CREATE INDEX IF NOT EXISTS idx_confessions_user_id ON public.confessions(user_id);

CREATE INDEX IF NOT EXISTS idx_comments_confession_id ON public.comments(confession_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_likes_user_id ON public.user_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_likes_confession_id ON public.user_likes(confession_id);
CREATE INDEX IF NOT EXISTS idx_user_likes_composite ON public.user_likes(user_id, confession_id);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_confession_id ON public.bookmarks(confession_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_composite ON public.bookmarks(user_id, confession_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON public.analytics_events(created_at DESC);