-- Update can_user_post_confession to recognize trial users as premium
CREATE OR REPLACE FUNCTION public.can_user_post_confession(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER;
  v_tier TEXT;
  v_limit INTEGER;
  v_can_post BOOLEAN;
  v_trial_active BOOLEAN;
  v_trial_ends_at TIMESTAMP WITH TIME ZONE;
BEGIN
  v_count := get_daily_confession_count(_user_id);
  
  -- Get tier and trial status
  SELECT 
    COALESCE(subscription_tier, 'free'),
    COALESCE(trial_active, false),
    trial_premium_ends_at
  INTO v_tier, v_trial_active, v_trial_ends_at
  FROM profiles
  WHERE user_id = _user_id;
  
  -- If on active trial, treat as vip (premium tier removed)
  IF v_trial_active AND v_trial_ends_at IS NOT NULL AND v_trial_ends_at > NOW() THEN
    v_tier := 'vip';
  END IF;
  
  CASE v_tier
    WHEN 'free' THEN v_limit := 3;
    -- Premium tier removed, only free and vip
    WHEN 'vip' THEN v_limit := -1;
    ELSE v_limit := 3;
  END CASE;
  
  IF v_limit = -1 THEN
    v_can_post := TRUE;
  ELSE
    v_can_post := v_count < v_limit;
  END IF;
  
  RETURN jsonb_build_object(
    'can_post', v_can_post,
    'current_count', v_count,
    'daily_limit', v_limit,
    'tier', v_tier,
    'remaining', CASE WHEN v_limit = -1 THEN -1 ELSE GREATEST(0, v_limit - v_count) END
  );
END;
$function$;