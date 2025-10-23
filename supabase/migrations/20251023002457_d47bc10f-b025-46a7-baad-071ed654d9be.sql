-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL,
  tier TEXT NOT NULL, -- free | premium | vip
  cadence TEXT NOT NULL, -- monthly | yearly
  price_id TEXT NOT NULL,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  pending_change JSONB
);

-- Create stripe_events table for idempotency
CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: users can read their own subscription
CREATE POLICY "sub_read_own"
ON subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create view for entitlements
CREATE OR REPLACE VIEW v_user_entitlements AS
SELECT
  user_id,
  tier,
  cadence,
  status,
  cancel_at_period_end,
  current_period_end,
  (tier IN ('premium','vip')) AS is_pro,
  (tier = 'vip') AS is_vip
FROM subscriptions;

-- Grant select on view to authenticated users
GRANT SELECT ON v_user_entitlements TO authenticated;