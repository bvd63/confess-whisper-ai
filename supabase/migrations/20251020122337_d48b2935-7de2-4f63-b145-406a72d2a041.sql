-- Add scope column to track trial vs owned purchases
ALTER TABLE user_flairs 
ADD COLUMN IF NOT EXISTS purchase_scope text DEFAULT 'OWNED' CHECK (purchase_scope IN ('OWNED', 'TRIAL'));

ALTER TABLE confession_boosts 
ADD COLUMN IF NOT EXISTS purchase_scope text DEFAULT 'OWNED' CHECK (purchase_scope IN ('OWNED', 'TRIAL'));

-- Function to revoke trial purchases when trial ends
CREATE OR REPLACE FUNCTION revoke_trial_purchases(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Deactivate trial-scoped flairs
  UPDATE user_flairs
  SET is_featured = false,
      is_public = false
  WHERE user_id = _user_id 
  AND purchase_scope = 'TRIAL';
  
  -- Mark trial boosts as expired
  UPDATE confession_boosts
  SET status = 'EXPIRED'
  WHERE user_id = _user_id 
  AND purchase_scope = 'TRIAL'
  AND status = 'ACTIVE';
END;
$$;