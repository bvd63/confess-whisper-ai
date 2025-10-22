-- Reset user blagavlad98@gmail.com to free tier
UPDATE profiles 
SET 
  subscription_tier = 'free',
  is_premium = false,
  subscription_status = 'free',
  subscription_ends_at = NULL,
  subscription_cancel_at_period_end = false,
  stripe_subscription_id = NULL,
  stripe_customer_id = NULL
WHERE user_id = '7e099d1c-5a3b-487b-9eeb-dea8505d9931';

-- Delete subscription record
DELETE FROM subscriptions 
WHERE user_id = '7e099d1c-5a3b-487b-9eeb-dea8505d9931';

-- Delete subscription bonus coin transactions
DELETE FROM coin_transactions 
WHERE user_id = '7e099d1c-5a3b-487b-9eeb-dea8505d9931' 
  AND (type = 'subscription_bonus' OR description ILIKE '%subscription%');