-- M2: unify trial flags and keep only free/vip subscription tiers for trial activation

-- Backfill canonical trial_used from legacy trial_premium_used when present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'trial_premium_used'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'trial_used'
  ) THEN
    UPDATE public.profiles
    SET trial_used = TRUE
    WHERE COALESCE(trial_used, FALSE) = FALSE
      AND COALESCE(trial_premium_used, FALSE) = TRUE;
  END IF;
END $$;

-- Ensure trial activation uses canonical trial_used and vip tier only
CREATE OR REPLACE FUNCTION public.activate_trial(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_profile RECORD;
  v_trial_end TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT * INTO v_profile
  FROM profiles
  WHERE user_id = _user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'user_not_found'
    );
  END IF;

  IF COALESCE(v_profile.trial_used, FALSE) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'trial_already_used'
    );
  END IF;

  v_trial_end := NOW() + INTERVAL '7 days';

  UPDATE profiles
  SET
    trial_active = true,
    trial_premium_ends_at = v_trial_end,
    trial_activated_at = NOW(),
    trial_used = true,
    subscription_tier = 'vip',
    onboarding_completed = true,
    updated_at = NOW()
  WHERE user_id = _user_id;

  RETURN jsonb_build_object(
    'success', true,
    'trial_ends_at', v_trial_end,
    'trial_duration_days', 7
  );
END;
$$;
