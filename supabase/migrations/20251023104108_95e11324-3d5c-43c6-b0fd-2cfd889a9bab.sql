-- Update Premium package: 600 -> 500 coins, price 5.49 -> 4.99
UPDATE coin_packages
SET 
  coins = 500,
  price_usd = 4.99,
  discount_percentage = 50
WHERE name = 'Premium';