-- Update Premium yearly price to $39.99
UPDATE subscription_plans
SET price_yearly = 3999  -- $39.99 in cents
WHERE name = 'Premium';