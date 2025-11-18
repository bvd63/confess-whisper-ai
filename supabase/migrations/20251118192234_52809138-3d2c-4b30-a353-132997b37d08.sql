-- Fix security warning by setting search_path on the function
CREATE OR REPLACE FUNCTION sync_subscription_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profile with subscription details
  UPDATE profiles
  SET 
    subscription_tier = NEW.tier,
    subscription_status = NEW.status,
    subscription_cadence = NEW.cadence,
    stripe_subscription_id = NEW.stripe_subscription_id,
    stripe_customer_id = NEW.stripe_customer_id,
    subscription_ends_at = NEW.current_period_end,
    subscription_cancel_at_period_end = NEW.cancel_at_period_end
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;