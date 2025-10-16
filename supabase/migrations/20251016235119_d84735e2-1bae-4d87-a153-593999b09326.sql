-- Update subscription plans with new USD prices
UPDATE subscription_plans
SET 
  price_monthly = 499,  -- $4.99 in cents
  price_yearly = 2999   -- $29.99 in cents
WHERE name = 'Premium';

UPDATE subscription_plans
SET 
  price_monthly = 999,  -- $9.99 in cents
  price_yearly = 7999   -- $79.99 in cents
WHERE name = 'VIP';