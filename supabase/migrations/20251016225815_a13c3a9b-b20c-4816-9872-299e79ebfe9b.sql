-- Recreate trending_confessions VIEW with proper security filters
DROP VIEW IF EXISTS public.trending_confessions;

CREATE VIEW public.trending_confessions AS
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
  AND is_private = false  -- Only public confessions
  AND (moderation_status = 'approved' OR moderation_status IS NULL)  -- Only approved content
  AND created_at > (now() - interval '7 days')
ORDER BY 
  calculate_trending_score(
    COALESCE(likes_count, 0), 
    COALESCE(comments_count, 0), 
    COALESCE(shared_count, 0), 
    COALESCE(views_count, 0), 
    created_at
  ) DESC;