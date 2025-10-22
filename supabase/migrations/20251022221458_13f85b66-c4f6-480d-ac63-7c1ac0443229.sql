-- Clear all trial and premium fields for user blagavlad98@gmail.com
UPDATE profiles 
SET 
  subscription_tier = 'free',
  is_premium = false,
  subscription_status = 'free',
  subscription_ends_at = NULL,
  subscription_cancel_at_period_end = false,
  stripe_subscription_id = NULL,
  stripe_customer_id = NULL,
  trial_active = false,
  trial_end_date = NULL,
  trial_premium_used = false,
  trial_premium_started_at = NULL,
  trial_premium_ends_at = NULL
WHERE user_id = '7e099d1c-5a3b-487b-9eeb-dea8505d9931';