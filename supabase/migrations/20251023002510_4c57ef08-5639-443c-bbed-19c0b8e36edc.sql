-- Fix security definer view by recreating with SECURITY INVOKER
DROP VIEW IF EXISTS v_user_entitlements;

CREATE OR REPLACE VIEW v_user_entitlements 
WITH (security_invoker=true) AS
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