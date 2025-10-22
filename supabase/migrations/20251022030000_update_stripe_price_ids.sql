-- Update Stripe Price IDs for coin packages

-- Starter: 50 coins - $0.99
UPDATE coin_packages 
SET stripe_price_id = 'price_1SL3TKR7kygIyYg9MAhdeUcZ' 
WHERE name = 'Starter' AND coins = 50;

-- Popular: 150 coins - $1.99
UPDATE coin_packages 
SET stripe_price_id = 'price_1SL3gSR7kygIyYg9J1swgELc' 
WHERE name = 'Popular' AND coins = 150;

-- Value: 350 coins - $3.99
UPDATE coin_packages 
SET stripe_price_id = 'price_1SL3gSR7kygIyYg9Eimr32Ve' 
WHERE name = 'Value' AND coins = 350;

-- Premium: 700 coins - $6.99
UPDATE coin_packages 
SET stripe_price_id = 'price_1SL3gSR7kygIyYg9oj5kDYrH' 
WHERE name = 'Premium' AND coins = 700;

-- Whale: 1250 coins - $9.99
UPDATE coin_packages 
SET stripe_price_id = 'price_1SL3gSR7kygIyYg9AsruFGnF' 
WHERE name = 'Whale' AND coins = 1250;
