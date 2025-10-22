-- Reset subscription for testing user
UPDATE profiles 
SET 
  subscription_tier = 'free',
  subscription_status = 'free',
  stripe_subscription_id = NULL,
  subscription_ends_at = NULL,
  subscription_cancel_at_period_end = false,
  is_premium = false
WHERE user_id = '7e099d1c-5a3b-487b-9eeb-dea8505d9931';