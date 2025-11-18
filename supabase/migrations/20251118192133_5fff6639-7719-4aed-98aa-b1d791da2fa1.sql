-- Add subscription_cadence column to profiles table to track billing interval
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_cadence text CHECK (subscription_cadence IN ('monthly', 'yearly'));

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_cadence 
ON profiles(subscription_cadence) 
WHERE subscription_cadence IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.subscription_cadence IS 'Tracks the billing interval for active subscriptions: monthly or yearly';