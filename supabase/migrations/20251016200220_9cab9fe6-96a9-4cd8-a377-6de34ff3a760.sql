-- Fix security issues

-- Drop and recreate the view without SECURITY DEFINER
DROP VIEW IF EXISTS trending_confessions;

-- Recreate view as regular view (not security definer)
CREATE VIEW trending_confessions 
WITH (security_invoker = true)
AS
SELECT 
  c.*,
  calculate_trending_score(
    COALESCE(c.likes_count, 0),
    COALESCE(c.comments_count, 0),
    COALESCE(c.shared_count, 0),
    COALESCE(c.views_count, 0),
    c.created_at
  ) as trending_score
FROM confessions c
WHERE c.is_draft = false
  AND c.created_at > NOW() - INTERVAL '7 days'
ORDER BY trending_score DESC;

-- Fix calculate_trending_score function to set search_path
CREATE OR REPLACE FUNCTION calculate_trending_score(
  likes INTEGER,
  comments INTEGER,
  shares INTEGER,
  views INTEGER,
  created_at TIMESTAMPTZ
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  age_hours NUMERIC;
  engagement_score NUMERIC;
  time_decay NUMERIC;
BEGIN
  -- Calculate age in hours
  age_hours := EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600.0;
  
  -- Calculate engagement score (weighted)
  engagement_score := (likes * 3) + (comments * 5) + (shares * 7) + (views * 0.1);
  
  -- Apply time decay (exponential decay, half-life of 24 hours)
  time_decay := POWER(0.5, age_hours / 24.0);
  
  -- Return final trending score
  RETURN engagement_score * time_decay;
END;
$$;