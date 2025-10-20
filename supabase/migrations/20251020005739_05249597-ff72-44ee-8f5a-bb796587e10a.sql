-- First, seed the 10 flairs as specified (if not already present)
-- This is idempotent - won't duplicate if data already exists

INSERT INTO profile_flairs (icon, name_key, cost, rarity, required_plan, is_active)
VALUES 
  ('⭐', 'flair_star', 50, 'common', 'free', true),
  ('🌸', 'flair_heart', 50, 'common', 'free', true),
  ('🌙', 'flair_moon', 50, 'common', 'free', true),
  ('🚀', 'flair_rocket', 120, 'uncommon', 'premium', true),
  ('🏆', 'flair_trophy', 120, 'uncommon', 'premium', true),
  ('🔥', 'flair_fire', 120, 'uncommon', 'premium', true),
  ('✨', 'flair_magic', 120, 'uncommon', 'premium', true),
  ('👑', 'flair_crown', 180, 'rare', 'vip', true),
  ('💠', 'flair_gem', 180, 'rare', 'vip', true),
  ('⚡', 'flair_lightning', 180, 'rare', 'vip', true)
ON CONFLICT (name_key) DO UPDATE 
SET 
  icon = EXCLUDED.icon,
  cost = EXCLUDED.cost,
  rarity = EXCLUDED.rarity,
  required_plan = EXCLUDED.required_plan,
  is_active = EXCLUDED.is_active;

-- Add cron job function to automatically deactivate expired flairs
-- This function will be called daily by a cron job
CREATE OR REPLACE FUNCTION deactivate_expired_flairs()
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
END;
$$;

-- Create a trigger function to check expiry on update/select
CREATE OR REPLACE FUNCTION check_flair_expiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the flair has expired, mark it as inactive
  IF NEW.expires_at IS NOT NULL AND NEW.expires_at < NOW() THEN
    NEW.is_featured := false;
    NEW.is_public := false;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS check_user_flair_expiry ON user_flairs;

-- Create trigger on user_flairs to auto-deactivate on update
CREATE TRIGGER check_user_flair_expiry
  BEFORE UPDATE ON user_flairs
  FOR EACH ROW
  EXECUTE FUNCTION check_flair_expiry();