-- Update VIP plan prices
UPDATE subscription_plans
SET 
  price_monthly = 999,  -- 9.99 in cents
  price_yearly = 8999   -- 89.99 in cents
WHERE name = 'VIP';