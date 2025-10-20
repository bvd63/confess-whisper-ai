
-- Update user to VIP subscription
UPDATE profiles 
SET 
  subscription_tier = 'vip',
  subscription_status = 'active',
  is_premium = true,
  subscription_ends_at = NULL
WHERE user_id = '7e099d1c-5a3b-487b-9eeb-dea8505d9931';
