-- Add nickname system enhancements to profiles table

-- Add nickname_lower for case-insensitive uniqueness and search
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nickname_lower text;

-- Add public/private nickname visibility flag
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_nickname_public boolean DEFAULT true;

-- Create index on nickname_lower for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_nickname_lower ON profiles(nickname_lower);

-- Add unique constraint on nickname_lower (case-insensitive unique nicknames)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_nickname_lower_unique ON profiles(nickname_lower) WHERE nickname_lower IS NOT NULL;

-- Function to validate and normalize nicknames
CREATE OR REPLACE FUNCTION validate_nickname(nick text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Length check: 3-24 characters
  IF length(nick) < 3 OR length(nick) > 24 THEN
    RETURN false;
  END IF;
  
  -- Character validation: only letters, numbers, and underscores
  IF nick !~ '^[a-zA-Z0-9_]+$' THEN
    RETURN false;
  END IF;
  
  -- No leading or trailing underscores
  IF nick ~ '^_' OR nick ~ '_$' THEN
    RETURN false;
  END IF;
  
  -- No double underscores
  IF nick ~ '__' THEN
    RETURN false;
  END IF;
  
  -- Banned words check (add more as needed)
  IF lower(nick) IN ('admin', 'moderator', 'support', 'system', 'anonymous', 'anonimo', 'anonym') THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Trigger to automatically set nickname_lower when nickname changes
CREATE OR REPLACE FUNCTION update_nickname_lower()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.nickname IS NOT NULL THEN
    -- Validate nickname
    IF NOT validate_nickname(NEW.nickname) THEN
      RAISE EXCEPTION 'Invalid nickname format';
    END IF;
    
    -- Set lowercase version
    NEW.nickname_lower := lower(NEW.nickname);
  ELSE
    NEW.nickname_lower := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_nickname_lower ON profiles;

-- Create trigger
CREATE TRIGGER trigger_update_nickname_lower
  BEFORE INSERT OR UPDATE OF nickname ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_nickname_lower();

-- Backfill existing nicknames
UPDATE profiles
SET nickname_lower = lower(nickname)
WHERE nickname IS NOT NULL AND nickname_lower IS NULL;