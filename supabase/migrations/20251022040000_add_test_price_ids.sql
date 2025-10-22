-- Add test mode Price IDs column
ALTER TABLE coin_packages 
ADD COLUMN IF NOT EXISTS stripe_price_id_test TEXT;

-- Create index for test Price IDs
CREATE INDEX IF NOT EXISTS idx_coin_packages_stripe_price_id_test 
ON coin_packages(stripe_price_id_test);

-- Update with test mode Price IDs
UPDATE coin_packages SET stripe_price_id_test = 'price_1SL3x7R7kygIyYg90jCVyX9U' WHERE name = 'Starter' AND coins = 50;
UPDATE coin_packages SET stripe_price_id_test = 'price_1SL4nHR7kygIyYg90KIP4aP7' WHERE name = 'Popular' AND coins = 150;
UPDATE coin_packages SET stripe_price_id_test = 'price_1SL4nHR7kygIyYg9jSm5QDQA' WHERE name = 'Value' AND coins = 350;
UPDATE coin_packages SET stripe_price_id_test = 'price_1SL4nHR7kygIyYg9vuNh6ufg' WHERE name = 'Premium' AND coins = 700;
UPDATE coin_packages SET stripe_price_id_test = 'price_1SL4nHR7kygIyYg9PrCmKjWs' WHERE name = 'Whale' AND coins = 1250;

-- Verify updates
SELECT name, coins, price_usd, stripe_price_id, stripe_price_id_test FROM coin_packages ORDER BY display_order;
