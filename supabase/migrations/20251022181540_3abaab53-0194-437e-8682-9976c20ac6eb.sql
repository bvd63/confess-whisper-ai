-- Create subscription_entitlements table
CREATE TABLE IF NOT EXISTS subscription_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  current_period_end TIMESTAMP WITH TIME ZONE,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE subscription_entitlements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_entitlements
CREATE POLICY "Users can view their own entitlements"
  ON subscription_entitlements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage entitlements"
  ON subscription_entitlements FOR ALL
  USING (auth.role() = 'service_role');

-- Create stripe_processed_events table
CREATE TABLE IF NOT EXISTS stripe_processed_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE stripe_processed_events ENABLE ROW LEVEL SECURITY;

-- Only service role can access
CREATE POLICY "Service role can manage processed events"
  ON stripe_processed_events FOR ALL
  USING (auth.role() = 'service_role');

-- Create subscription_change_requests table
CREATE TABLE IF NOT EXISTS subscription_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_price_id TEXT NOT NULL,
  target_tier TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE subscription_change_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own change requests"
  ON subscription_change_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage change requests"
  ON subscription_change_requests FOR ALL
  USING (auth.role() = 'service_role');

-- Create subscription_audit table
CREATE TABLE IF NOT EXISTS subscription_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE subscription_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own audit logs"
  ON subscription_audit FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert audit logs"
  ON subscription_audit FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Add trigger for updated_at on subscription_entitlements
CREATE TRIGGER update_subscription_entitlements_updated_at
  BEFORE UPDATE ON subscription_entitlements
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_entitlements_updated_at();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_entitlements_user_id ON subscription_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_stripe_sub ON subscription_entitlements(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_user_status ON subscription_change_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_user_created ON subscription_audit(user_id, created_at DESC);