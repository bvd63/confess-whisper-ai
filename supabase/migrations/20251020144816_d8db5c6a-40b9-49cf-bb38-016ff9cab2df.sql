-- Grant permanent VIP status to blagavlad98@gmail.com
UPDATE profiles 
SET 
  subscription_tier = 'vip',
  is_premium = true,
  subscription_status = 'active',
  subscription_ends_at = NULL,
  trial_active = false,
  trial_end_date = NULL
WHERE user_id = '7e099d1c-5a3b-487b-9eeb-dea8505d9931';