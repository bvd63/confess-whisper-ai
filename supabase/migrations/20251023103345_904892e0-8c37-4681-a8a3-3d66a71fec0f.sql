-- Update VIP subscription prices (stored in cents)
UPDATE subscription_plans
SET 
  price_monthly = 699,  -- $6.99
  price_yearly = 5599  -- $55.99
WHERE name = 'VIP';