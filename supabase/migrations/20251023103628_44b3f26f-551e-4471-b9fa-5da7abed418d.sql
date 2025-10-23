-- Deactivate Whale package
UPDATE coin_packages
SET is_active = false
WHERE name = 'Whale';

-- Update Premium package with new values
UPDATE coin_packages
SET 
  coins = 600,
  price_usd = 5.49,
  discount_percentage = 54
WHERE name = 'Premium';