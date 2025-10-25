-- Remove Premium SUBSCRIPTION tier, keep Premium COIN PACKAGE
-- Date: 2025-10-25
-- Purpose: Clean up premium subscription tier while preserving premium coin packages

-- ============================================================================
-- 1. Fix confession limits function (remove premium tier, only free/vip)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.can_user_post_confession(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
  v_tier TEXT;
  v_limit INTEGER;
BEGIN
  -- Get current daily confession count
  v_count := get_daily_confession_count(_user_id);
  
  -- Get user's subscription tier (default to free)
  SELECT COALESCE(subscription_tier, 'free') INTO v_tier
  FROM profiles WHERE user_id = _user_id;
  
  -- Set limits: Only free (3) or vip (unlimited)
  v_limit := CASE 
    WHEN v_tier = 'vip' THEN -1  -- Unlimited for VIP
    ELSE 3  -- 3 confessions for free tier
  END;
  
  RETURN jsonb_build_object(
    'can_post', v_limit = -1 OR v_count < v_limit,
    'current_count', v_count,
    'daily_limit', v_limit,
    'tier', v_tier,
    'remaining', CASE WHEN v_limit = -1 THEN -1 ELSE GREATEST(0, v_limit - v_count) END
  );
END;
$$;

-- ============================================================================
-- 2. Update any premium subscription users to free
-- ============================================================================
UPDATE profiles 
SET subscription_tier = 'free',
    updated_at = now()
WHERE subscription_tier = 'premium';

-- ============================================================================
-- 3. Update flairs that required premium subscription
-- ============================================================================
UPDATE profile_flairs 
SET required_plan = 'free'
WHERE required_plan = 'premium';

-- ============================================================================
-- 4. Remove Premium from subscription_plans (NOT from coin_packages!)
-- ============================================================================
-- Only delete from subscription_plans table, not coin_packages
DELETE FROM subscription_plans 
WHERE name = 'Premium' 
  AND id NOT IN (
    SELECT id FROM coin_packages WHERE name = 'Premium'
  );

-- Alternative: If tables are separate, just delete premium subscription plan
DELETE FROM subscription_plans 
WHERE tier = 'premium' OR name ILIKE '%premium%subscription%';

-- ============================================================================
-- 5. Update badges that required premium subscription
-- ============================================================================
UPDATE badges 
SET requirement_value = 'free'
WHERE requirement_type = 'subscription' 
  AND requirement_value = 'premium';

-- ============================================================================
-- 6. Add check constraint to ensure only free/vip subscription tiers
-- ============================================================================
DO $$ 
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;
  
  -- Add new constraint: only 'free' or 'vip'
  ALTER TABLE profiles 
  ADD CONSTRAINT profiles_subscription_tier_check 
  CHECK (subscription_tier IN ('free', 'vip') OR subscription_tier IS NULL);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 7. Verification queries (commented out, run manually if needed)
-- ============================================================================
-- SELECT subscription_tier, COUNT(*) 
-- FROM profiles 
-- GROUP BY subscription_tier;

-- SELECT name, required_plan 
-- FROM profile_flairs 
-- WHERE required_plan = 'premium';

-- SELECT name, price_monthly 
-- FROM coin_packages 
-- WHERE name = 'Premium';
