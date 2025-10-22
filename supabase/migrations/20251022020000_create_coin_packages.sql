-- Create coin_packages table with optimized pricing structure
CREATE TABLE IF NOT EXISTS coin_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  coins INTEGER NOT NULL,
  price_usd DECIMAL(10,2) NOT NULL,
  discount_percentage INTEGER NOT NULL DEFAULT 0,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE coin_packages ENABLE ROW LEVEL SECURITY;

-- RLS policy: Anyone can view active packages
CREATE POLICY "Anyone can view active coin packages"
ON coin_packages FOR SELECT
USING (is_active = true);

-- Insert optimized pricing structure: 50-1250 coins, $0.99-$9.99
INSERT INTO coin_packages (name, coins, price_usd, discount_percentage, is_popular, display_order) VALUES
  ('Starter', 50, 0.99, 0, false, 1),
  ('Popular', 150, 1.99, 33, true, 2),
  ('Value', 350, 3.99, 42, false, 3),
  ('Premium', 700, 6.99, 49, false, 4),
  ('Whale', 1250, 9.99, 60, false, 5)
ON CONFLICT (name) DO UPDATE SET
  coins = EXCLUDED.coins,
  price_usd = EXCLUDED.price_usd,
  discount_percentage = EXCLUDED.discount_percentage,
  is_popular = EXCLUDED.is_popular,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_coin_packages_display_order ON coin_packages(display_order);
CREATE INDEX IF NOT EXISTS idx_coin_packages_active ON coin_packages(is_active);

-- Add trigger for updated_at
CREATE TRIGGER update_coin_packages_updated_at
BEFORE UPDATE ON coin_packages
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
