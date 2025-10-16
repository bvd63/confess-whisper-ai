-- Update subscription plans with new Stripe Price IDs
UPDATE subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SJ0hLR7kygIyYg9PXy1NFp5',
  stripe_price_id_yearly = 'price_1SJ0hcR7kygIyYg9w7QQA8V3'
WHERE name = 'Premium';