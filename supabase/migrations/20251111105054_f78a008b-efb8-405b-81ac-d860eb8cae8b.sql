-- Add trial fields to profiles table if they don't exist
DO $$ 
BEGIN
  -- Add trial_active column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'trial_active'
  ) THEN
    ALTER TABLE profiles ADD COLUMN trial_active BOOLEAN DEFAULT false;
  END IF;

  -- Add trial_premium_ends_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'trial_premium_ends_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN trial_premium_ends_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add trial_activated_at column  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'trial_activated_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN trial_activated_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add trial_used column to track if user has already used their trial
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'trial_used'
  ) THEN
    ALTER TABLE profiles ADD COLUMN trial_used BOOLEAN DEFAULT false;
  END IF;

  -- Add onboarding_completed column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Create function to activate trial period (7 days)
CREATE OR REPLACE FUNCTION activate_trial(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_profile RECORD;
  v_trial_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Check if user exists and hasn't used trial
  SELECT * INTO v_profile
  FROM profiles
  WHERE user_id = _user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'user_not_found'
    );
  END IF;

  IF v_profile.trial_used THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'trial_already_used'
    );
  END IF;

  -- Set trial end date (7 days from now)
  v_trial_end := NOW() + INTERVAL '7 days';

  -- Activate trial
  UPDATE profiles
  SET 
    trial_active = true,
    trial_premium_ends_at = v_trial_end,
    trial_activated_at = NOW(),
    trial_used = true,
    subscription_tier = 'premium',
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

-- Create function to check trial expiry
CREATE OR REPLACE FUNCTION check_trial_expiry(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_profile RECORD;
  v_is_expired BOOLEAN;
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

  -- Check if trial is expired
  v_is_expired := v_profile.trial_active 
    AND v_profile.trial_premium_ends_at IS NOT NULL 
    AND v_profile.trial_premium_ends_at < NOW();

  IF v_is_expired THEN
    -- Expire trial
    UPDATE profiles
    SET 
      trial_active = false,
      subscription_tier = 'free',
      updated_at = NOW()
    WHERE user_id = _user_id;

    -- Revoke trial-scoped purchases
    PERFORM revoke_trial_purchases(_user_id);

    RETURN jsonb_build_object(
      'success', true,
      'trial_expired', true,
      'expired_at', v_profile.trial_premium_ends_at
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'trial_expired', false,
    'trial_active', v_profile.trial_active,
    'trial_ends_at', v_profile.trial_premium_ends_at
  );
END;
$$;