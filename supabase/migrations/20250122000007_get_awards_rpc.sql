CREATE OR REPLACE FUNCTION get_confession_awards(confession_id_param UUID)
RETURNS TABLE (award_type TEXT, award_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ca.award_type::TEXT,
    COUNT(*)::BIGINT as award_count
  FROM confession_awards ca
  WHERE ca.confession_id = confession_id_param
  GROUP BY ca.award_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
