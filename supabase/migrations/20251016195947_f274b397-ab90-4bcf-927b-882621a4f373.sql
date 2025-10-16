-- Create function to increment share count
CREATE OR REPLACE FUNCTION increment_share_count(confession_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE confessions
  SET shared_count = COALESCE(shared_count, 0) + 1
  WHERE id = confession_id;
END;
$$;