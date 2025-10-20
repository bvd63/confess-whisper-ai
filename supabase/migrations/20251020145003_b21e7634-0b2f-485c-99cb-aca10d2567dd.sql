-- Grant VIP welcome bonus and VIP-exclusive flairs
-- Award 1000 bonus coins for VIP status
INSERT INTO user_coins (user_id, balance, lifetime_earned)
VALUES ('7e099d1c-5a3b-487b-9eeb-dea8505d9931', 1804, 1029)
ON CONFLICT (user_id)
DO UPDATE SET
  balance = user_coins.balance + 1000,
  lifetime_earned = user_coins.lifetime_earned + 1000,
  updated_at = NOW();

-- Record the VIP bonus transaction
INSERT INTO coin_transactions (user_id, amount, type, description)
VALUES ('7e099d1c-5a3b-487b-9eeb-dea8505d9931', 1000, 'vip_bonus', 'VIP welcome bonus');

-- Grant all VIP-exclusive flairs (permanent, no expiry)
INSERT INTO user_flairs (user_id, flair_id, is_featured, is_public, purchase_scope, expires_at)
SELECT 
  '7e099d1c-5a3b-487b-9eeb-dea8505d9931',
  id,
  false,
  true,
  'OWNED',
  NULL
FROM profile_flairs
WHERE required_plan = 'vip' AND is_active = true
ON CONFLICT (user_id, flair_id) DO NOTHING;