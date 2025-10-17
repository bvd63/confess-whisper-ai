-- Fix security warnings from linter

-- 1. Fix function search path warning - add search_path to existing functions that don't have it
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. Hide materialized view from API by revoking permissions
REVOKE ALL ON hot_confessions FROM anon;
REVOKE ALL ON hot_confessions FROM authenticated;

-- Grant SELECT only to authenticated users through a secure function
CREATE OR REPLACE FUNCTION get_hot_confessions(limit_count integer DEFAULT 50)
RETURNS TABLE (
  id uuid,
  content text,
  category text,
  user_id uuid,
  comments_count integer,
  likes_count integer,
  ai_response text,
  ai_deep_insight text,
  created_at timestamp with time zone,
  hot_score numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    content,
    category,
    user_id,
    comments_count,
    likes_count,
    ai_response,
    ai_deep_insight,
    created_at,
    hot_score
  FROM hot_confessions
  ORDER BY hot_score DESC
  LIMIT limit_count;
$$;