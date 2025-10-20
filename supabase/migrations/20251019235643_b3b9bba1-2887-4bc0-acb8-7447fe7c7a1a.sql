-- Fix search_path for validate_nickname function
CREATE OR REPLACE FUNCTION validate_nickname(nick text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
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