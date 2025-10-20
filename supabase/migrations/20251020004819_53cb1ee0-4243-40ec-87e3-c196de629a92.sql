-- Function to automatically deactivate expired flairs and badges
CREATE OR REPLACE FUNCTION deactivate_expired_perks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create a trigger function that runs on SELECT to check expiry
CREATE OR REPLACE FUNCTION check_perk_expiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Apply trigger to user_flairs on INSERT and UPDATE
DROP TRIGGER IF EXISTS trigger_check_flair_expiry ON user_flairs;
CREATE TRIGGER trigger_check_flair_expiry
  BEFORE INSERT OR UPDATE ON user_flairs
  FOR EACH ROW
  EXECUTE FUNCTION check_perk_expiry();

-- Apply trigger to user_badges on INSERT and UPDATE
DROP TRIGGER IF EXISTS trigger_check_badge_expiry ON user_badges;
CREATE TRIGGER trigger_check_badge_expiry
  BEFORE INSERT OR UPDATE ON user_badges
  FOR EACH ROW
  EXECUTE FUNCTION check_perk_expiry();

-- Enable realtime for user_flairs and user_badges so BadgeDisplay can update
ALTER PUBLICATION supabase_realtime ADD TABLE user_flairs;
ALTER PUBLICATION supabase_realtime ADD TABLE user_badges;