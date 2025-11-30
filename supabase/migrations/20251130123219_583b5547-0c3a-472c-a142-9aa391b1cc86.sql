-- Add alias column to comments table for anonymous display
ALTER TABLE public.comments
ADD COLUMN alias TEXT;

-- Create function to generate stable anonymous alias per (user_id, confession_id)
CREATE OR REPLACE FUNCTION public.generate_comment_alias(p_user_id UUID, p_confession_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  word_list TEXT[] := ARRAY['Moon', 'Star', 'Shadow', 'Echo', 'Frost', 'Wind', 'Cloud', 'Rain', 'Dawn', 'Dusk', 'Ember', 'Wave', 'Storm', 'Leaf', 'Stone', 'Fire', 'Sky', 'River', 'Ocean', 'Mountain'];
  word_index INT;
  number_part INT;
  combined_hash TEXT;
BEGIN
  -- Create a deterministic hash from user_id and confession_id
  combined_hash := md5(p_user_id::TEXT || p_confession_id::TEXT);
  
  -- Convert first 8 chars of hash to integer to get word index (1-20)
  word_index := (('x' || substring(combined_hash, 1, 8))::bit(32)::bigint % 20) + 1;
  
  -- Convert next 8 chars to get number (1-99)
  number_part := (('x' || substring(combined_hash, 9, 8))::bit(32)::bigint % 99) + 1;
  
  RETURN word_list[word_index] || '-' || number_part::TEXT;
END;
$$;

-- Create function to check daily comment limit
CREATE OR REPLACE FUNCTION public.check_daily_comment_limit(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_is_vip BOOLEAN;
  v_comment_count INT;
  v_daily_limit INT;
BEGIN
  -- Check if user is VIP
  SELECT 
    CASE 
      WHEN subscription_tier = 'vip' OR is_premium = true THEN true
      ELSE false
    END INTO v_is_vip
  FROM profiles
  WHERE user_id = p_user_id;
  
  -- Set limit based on tier
  IF v_is_vip THEN
    v_daily_limit := 999999; -- Effectively unlimited
  ELSE
    v_daily_limit := 20; -- FREE users: 20 per day
  END IF;
  
  -- Count comments from today
  SELECT COUNT(*)::INT INTO v_comment_count
  FROM comments
  WHERE user_id = p_user_id
  AND created_at >= CURRENT_DATE;
  
  RETURN jsonb_build_object(
    'can_comment', v_comment_count < v_daily_limit,
    'comments_today', v_comment_count,
    'daily_limit', v_daily_limit,
    'remaining', GREATEST(0, v_daily_limit - v_comment_count)
  );
END;
$$;

-- Create function to check consecutive comment limit per confession
CREATE OR REPLACE FUNCTION public.check_consecutive_comment_limit(p_user_id UUID, p_confession_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_last_three_comments UUID[];
  v_consecutive_count INT := 0;
BEGIN
  -- Get last 3 comment user_ids for this confession
  SELECT ARRAY_AGG(user_id ORDER BY created_at DESC)
  INTO v_last_three_comments
  FROM (
    SELECT user_id, created_at
    FROM comments
    WHERE confession_id = p_confession_id
    ORDER BY created_at DESC
    LIMIT 3
  ) sub;
  
  -- If less than 3 comments exist, allow
  IF v_last_three_comments IS NULL OR array_length(v_last_three_comments, 1) < 3 THEN
    RETURN jsonb_build_object('can_comment', true, 'reason', 'less_than_3_comments');
  END IF;
  
  -- Count how many of the last 3 are from this user
  SELECT COUNT(*)::INT INTO v_consecutive_count
  FROM unnest(v_last_three_comments) AS uid
  WHERE uid = p_user_id;
  
  -- If all 3 are from this user, block
  IF v_consecutive_count >= 3 THEN
    RETURN jsonb_build_object('can_comment', false, 'reason', 'consecutive_limit');
  END IF;
  
  RETURN jsonb_build_object('can_comment', true, 'reason', 'ok');
END;
$$;

-- Create function to check comment cooldown (10 seconds)
CREATE OR REPLACE FUNCTION public.check_comment_cooldown(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_last_comment_time TIMESTAMP WITH TIME ZONE;
  v_seconds_since INT;
BEGIN
  -- Get last comment time for this user
  SELECT created_at INTO v_last_comment_time
  FROM comments
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no previous comment, allow
  IF v_last_comment_time IS NULL THEN
    RETURN jsonb_build_object('can_comment', true, 'seconds_remaining', 0);
  END IF;
  
  -- Calculate seconds since last comment
  v_seconds_since := EXTRACT(EPOCH FROM (NOW() - v_last_comment_time))::INT;
  
  -- Check if cooldown (10 seconds) has passed
  IF v_seconds_since < 10 THEN
    RETURN jsonb_build_object(
      'can_comment', false, 
      'seconds_remaining', 10 - v_seconds_since
    );
  END IF;
  
  RETURN jsonb_build_object('can_comment', true, 'seconds_remaining', 0);
END;
$$;