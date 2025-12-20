-- Async moderation support: visibility columns and scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Ensure moderation columns exist and defaults are correct
ALTER TABLE public.confessions
  ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS moderation_reason TEXT;

-- Backfill legacy rows to approved and visible
UPDATE public.confessions
SET moderation_status = 'approved',
    is_hidden = COALESCE(is_hidden, false)
WHERE moderation_status IS NULL OR moderation_status = 'pending';

-- Visibility-friendly index
CREATE INDEX IF NOT EXISTS idx_confessions_moderation_visibility
ON public.confessions (moderation_status, is_hidden, created_at DESC);

-- Recreate trending_confessions view with hidden filter
DROP VIEW IF EXISTS public.trending_confessions;
CREATE VIEW public.trending_confessions
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  content,
  ai_response,
  ai_deep_insight,
  is_reported,
  created_at,
  updated_at,
  likes_count,
  views_count,
  shared_count,
  category,
  comments_count,
  image_url,
  image_blurred,
  is_draft,
  is_private,
  calculate_trending_score(
    COALESCE(likes_count, 0),
    COALESCE(comments_count, 0),
    COALESCE(shared_count, 0),
    COALESCE(views_count, 0),
    created_at
  ) AS trending_score
FROM public.confessions
WHERE 
  is_draft = false
  AND is_private = false
  AND moderation_status = 'approved'
  AND COALESCE(is_hidden, false) = false
  AND created_at > (now() - interval '7 days')
ORDER BY calculate_trending_score(
  COALESCE(likes_count, 0),
  COALESCE(comments_count, 0),
  COALESCE(shared_count, 0),
  COALESCE(views_count, 0),
  created_at
) DESC;
COMMENT ON VIEW public.trending_confessions IS 'Trending confessions filtered to approved and visible content';

-- Recreate hot_confessions materialized view to exclude hidden items
DROP MATERIALIZED VIEW IF EXISTS hot_confessions;
CREATE MATERIALIZED VIEW hot_confessions AS
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
  AND COALESCE(c.is_hidden, false) = false
  AND c.is_private = false
  AND c.created_at > NOW() - INTERVAL '7 days'
ORDER BY hot_score DESC
LIMIT 100;

CREATE UNIQUE INDEX IF NOT EXISTS idx_hot_confessions_id ON hot_confessions (id);
REVOKE ALL ON hot_confessions FROM PUBLIC;
REVOKE ALL ON hot_confessions FROM anon;
REVOKE ALL ON hot_confessions FROM authenticated;

-- Cron schedule to run moderation worker every 2 minutes
SELECT cron.schedule(
  'moderation-worker-interval',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url:='https://fxwvlbopvnjjjrzshqvw.supabase.co/functions/v1/moderation-worker',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4d3ZsYm9wdm5qampyenNocXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1Mjg3ODQsImV4cCI6MjA3NjEwNDc4NH0.BXOtdXXS8PvqZSVcksyCuqNW0ebJ7nE58-CKSnSPk4Q"}'::jsonb,
    body:='{"trigger": "cron"}'::jsonb
  );
  $$
);
