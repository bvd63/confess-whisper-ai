-- Create subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price_monthly INTEGER NOT NULL,
  price_yearly INTEGER NOT NULL,
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, price_monthly, price_yearly, features) VALUES
('Premium', 1999, 19990, '["Răspunsuri AI nelimitate", "Analize avansate", "Badge-uri exclusive", "Fără reclame", "Prioritate în moderare"]'::jsonb),
('VIP', 4999, 49990, '["Toate beneficiile Premium", "Confesiuni cu imagine", "Statistici detaliate", "Suport prioritar", "Badge VIP special"]'::jsonb)
ON CONFLICT DO NOTHING;

-- Enable RLS on subscription_plans
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view subscription plans"
ON subscription_plans FOR SELECT
USING (true);

-- Update profiles table subscription fields
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN DEFAULT false;

-- Create referral rewards table
CREATE TABLE IF NOT EXISTS referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL, -- 'coins', 'premium_days', 'badge'
  reward_value INTEGER NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, referral_id)
);

-- Enable RLS on referral_rewards
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their rewards"
ON referral_rewards FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their rewards"
ON referral_rewards FOR INSERT
WITH CHECK (auth.uid() = user_id);