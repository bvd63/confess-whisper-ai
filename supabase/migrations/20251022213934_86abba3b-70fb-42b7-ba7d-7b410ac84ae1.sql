-- Tabel subscriptions: single row per user (enforced in app), mirror of Stripe sub
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL,
  tier TEXT NOT NULL,
  cadence TEXT NOT NULL,
  price_id TEXT NOT NULL,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  pending_change JSONB
);

-- Idempotency pentru webhooks
CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

-- Policies pentru subscriptions
CREATE POLICY "Users can view their own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
  ON subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- Policies pentru stripe_events
CREATE POLICY "Service role can manage stripe_events"
  ON stripe_events FOR ALL
  USING (auth.role() = 'service_role');