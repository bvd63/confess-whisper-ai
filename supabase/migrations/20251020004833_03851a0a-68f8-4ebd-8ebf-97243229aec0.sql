-- Fix function search_path for deactivate_expired_perks
CREATE OR REPLACE FUNCTION deactivate_expired_perks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deactivate expired user_flairs by removing featured status and making them private
  UPDATE user_flairs
  SET 
    is_featured = false,
    is_public = false
  WHERE 
    expires_at IS NOT NULL 
    AND expires_at < NOW()
    AND (is_featured = true OR is_public = true);

  -- Deactivate expired user_badges by removing featured status and making them private
  UPDATE user_badges
  SET 
    is_featured = false,
    is_public = false
  WHERE 
    expires_at IS NOT NULL 
    AND expires_at < NOW()
    AND (is_featured = true OR is_public = true);
END;
$$;

-- Fix function search_path for check_perk_expiry
CREATE OR REPLACE FUNCTION check_perk_expiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the perk has expired, mark it as inactive
  IF NEW.expires_at IS NOT NULL AND NEW.expires_at < NOW() THEN
    NEW.is_featured := false;
    NEW.is_public := false;
  END IF;
  
  RETURN NEW;
END;
$$;