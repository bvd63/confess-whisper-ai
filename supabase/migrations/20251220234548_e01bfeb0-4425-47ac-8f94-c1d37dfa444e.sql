-- Create public_profiles view that exposes limited profile data for public access
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  user_id,
  nickname,
  bio,
  avatar_url,
  is_nickname_public,
  subscription_tier,
  followers_count,
  following_count,
  posts_count,
  level,
  created_at
FROM public.profiles
WHERE is_nickname_public = true OR nickname_visibility = 'PUBLIC';