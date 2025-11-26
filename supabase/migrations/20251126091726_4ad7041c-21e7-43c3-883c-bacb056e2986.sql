-- Create function to get awards count by type for a confession
CREATE OR REPLACE FUNCTION public.get_confession_awards(confession_id_param UUID)
RETURNS TABLE (
  award_type TEXT,
  award_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    award_type,
    COUNT(*) as award_count
  FROM confession_awards
  WHERE confession_id = confession_id_param
  GROUP BY award_type
  ORDER BY award_count DESC;
$$;