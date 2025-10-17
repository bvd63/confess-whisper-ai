-- Fix remaining function search path warnings

-- Update all existing functions to have search_path set
CREATE OR REPLACE FUNCTION update_subscription_entitlements_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;