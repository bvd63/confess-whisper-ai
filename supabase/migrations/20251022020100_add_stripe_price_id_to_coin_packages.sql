-- Add stripe_price_id column to coin_packages table
ALTER TABLE coin_packages 
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_coin_packages_stripe_price_id 
ON coin_packages(stripe_price_id);
