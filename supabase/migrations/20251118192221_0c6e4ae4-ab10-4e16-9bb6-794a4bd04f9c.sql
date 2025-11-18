-- Create function to sync subscription data to profiles table
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically sync subscriptions to profiles
DROP TRIGGER IF EXISTS sync_subscription_to_profile_trigger ON subscriptions;
CREATE TRIGGER sync_subscription_to_profile_trigger
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_subscription_to_profile();

-- Backfill existing subscriptions to update profiles with cadence
UPDATE profiles p
SET subscription_cadence = s.cadence
FROM subscriptions s
WHERE p.user_id = s.user_id
  AND s.status = 'active'
  AND p.subscription_cadence IS NULL;