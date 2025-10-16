-- Update Stripe price IDs for Premium plan
UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SJ0vvR7kygIyYg9oT1ju6lQ',
  stripe_price_id_yearly = 'price_1SJ0vvR7kygIyYg9yORadPGD'
WHERE name = 'Premium';

-- Update Stripe price IDs for VIP plan
UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SJ0vwR7kygIyYg9OeCiqV00',
  stripe_price_id_yearly = 'price_1SJ0vvR7kygIyYg9BJuciYGd'
WHERE name = 'VIP';