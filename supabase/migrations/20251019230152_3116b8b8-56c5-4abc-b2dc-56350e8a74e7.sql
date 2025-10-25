-- Security Fix: Add search_path to all SECURITY DEFINER functions
-- This prevents privilege escalation through schema manipulation attacks

-- Fix: is_conversation_participant
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conversation_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM conversation_participants
    WHERE conversation_id = conversation_uuid
      AND user_id = user_uuid
  )
$$;

-- Fix: create_message_notification
CREATE OR REPLACE FUNCTION public.create_message_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_id UUID;
BEGIN
  SELECT user_id INTO recipient_id
  FROM conversation_participants
  WHERE conversation_id = NEW.conversation_id
    AND user_id != NEW.sender_id
  LIMIT 1;

  IF recipient_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, triggered_by, comment_content)
    VALUES (recipient_id, 'comment', NEW.sender_id, NEW.content);
  END IF;

  RETURN NEW;
END;
$$;

-- Fix: update_community_member_count
CREATE OR REPLACE FUNCTION public.update_community_member_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE communities SET member_count = GREATEST(0, member_count - 1) WHERE id = OLD.community_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix: delete_conversation
CREATE OR REPLACE FUNCTION public.delete_conversation(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = _conversation_id
    AND user_id = _user_id
  ) THEN
    RETURN FALSE;
  END IF;

  DELETE FROM messages WHERE conversation_id = _conversation_id;
  DELETE FROM conversation_participants WHERE conversation_id = _conversation_id;
  DELETE FROM conversations WHERE id = _conversation_id;

  RETURN TRUE;
END;
$$;

-- Fix: get_user_nickname
CREATE OR REPLACE FUNCTION public.get_user_nickname(_target_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nickname
  FROM profiles
  WHERE user_id = _target_user_id
    AND nickname IS NOT NULL;
$$;

-- Fix: update_community_post_count
CREATE OR REPLACE FUNCTION public.update_community_post_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.community_id IS NOT NULL AND NEW.moderation_status = 'approved' THEN
    UPDATE communities SET post_count = post_count + 1 WHERE id = NEW.community_id;
  ELSIF TG_OP = 'DELETE' AND OLD.community_id IS NOT NULL AND OLD.moderation_status = 'approved' THEN
    UPDATE communities SET post_count = GREATEST(0, post_count - 1) WHERE id = OLD.community_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.community_id != OLD.community_id THEN
    IF OLD.community_id IS NOT NULL AND OLD.moderation_status = 'approved' THEN
      UPDATE communities SET post_count = GREATEST(0, post_count - 1) WHERE id = OLD.community_id;
    END IF;
    IF NEW.community_id IS NOT NULL AND NEW.moderation_status = 'approved' THEN
      UPDATE communities SET post_count = post_count + 1 WHERE id = NEW.community_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix: is_community_admin
CREATE OR REPLACE FUNCTION public.is_community_admin(_user_id uuid, _community_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM community_members
    WHERE user_id = _user_id
      AND community_id = _community_id
      AND role IN ('admin', 'moderator')
  )
$$;

-- Fix: update_user_streak
CREATE OR REPLACE FUNCTION public.update_user_streak()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  streak_record RECORD;
  days_diff INTEGER;
BEGIN
  SELECT * INTO streak_record FROM user_streaks WHERE user_id = NEW.user_id;
  
  IF NOT FOUND THEN
    INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_confession_date)
    VALUES (NEW.user_id, 1, 1, CURRENT_DATE);
  ELSE
    days_diff := CURRENT_DATE - streak_record.last_confession_date;
    
    IF days_diff = 0 THEN
      RETURN NEW;
    ELSIF days_diff = 1 THEN
      UPDATE user_streaks 
      SET current_streak = current_streak + 1,
          longest_streak = GREATEST(longest_streak, current_streak + 1),
          last_confession_date = CURRENT_DATE,
          updated_at = NOW()
      WHERE user_id = NEW.user_id;
    ELSE
      UPDATE user_streaks 
      SET current_streak = 1,
          last_confession_date = CURRENT_DATE,
          updated_at = NOW()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix: check_and_award_badges
CREATE OR REPLACE FUNCTION public.check_and_award_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  badge_record RECORD;
  user_stat INTEGER;
BEGIN
  FOR badge_record IN SELECT * FROM badges LOOP
    IF NOT EXISTS (
      SELECT 1 FROM user_badges 
      WHERE user_id = NEW.user_id AND badge_id = badge_record.id
    ) THEN
      user_stat := 0;
      
      CASE badge_record.requirement_type
        WHEN 'confessions_count' THEN
          SELECT COUNT(*) INTO user_stat FROM confessions WHERE user_id = NEW.user_id;
        WHEN 'likes_received' THEN
          SELECT SUM(c.likes_count) INTO user_stat 
          FROM confessions c WHERE c.user_id = NEW.user_id;
        WHEN 'streak_days' THEN
          SELECT current_streak INTO user_stat 
          FROM user_streaks WHERE user_id = NEW.user_id;
        WHEN 'years_active' THEN
          SELECT EXTRACT(YEAR FROM AGE(NOW(), created_at)) INTO user_stat
          FROM profiles WHERE user_id = NEW.user_id;
        WHEN 'comments_count' THEN
          SELECT COUNT(*) INTO user_stat FROM comments WHERE user_id = NEW.user_id;
        WHEN 'shares_given' THEN
          SELECT SUM(shared_count) INTO user_stat FROM confessions WHERE user_id = NEW.user_id;
        WHEN 'views_count' THEN
          user_stat := 0;
        WHEN 'bookmarks_count' THEN
          SELECT COUNT(*) INTO user_stat FROM bookmarks WHERE user_id = NEW.user_id;
        WHEN 'night_confessions' THEN
          SELECT COUNT(*) INTO user_stat 
          FROM confessions 
          WHERE user_id = NEW.user_id 
          AND (EXTRACT(HOUR FROM created_at) >= 22 OR EXTRACT(HOUR FROM created_at) < 6);
        WHEN 'followers_count' THEN
          SELECT COUNT(*) INTO user_stat FROM user_follows WHERE following_id = NEW.user_id;
        WHEN 'viral_confession' THEN
          SELECT MAX(likes_count) INTO user_stat FROM confessions WHERE user_id = NEW.user_id;
      END CASE;
      
      IF user_stat >= badge_record.requirement_value THEN
        INSERT INTO user_badges (user_id, badge_id)
        VALUES (NEW.user_id, badge_record.id);
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Fix: increment_share_count
CREATE OR REPLACE FUNCTION public.increment_share_count(confession_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE confessions
  SET shared_count = COALESCE(shared_count, 0) + 1
  WHERE id = confession_id;
END;
$$;

-- Fix: get_or_create_conversation
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(_user1 uuid, _user2 uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv_id uuid;
BEGIN
  SELECT cp1.conversation_id INTO conv_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = _user1 AND cp2.user_id = _user2
  LIMIT 1;

  IF conv_id IS NOT NULL THEN
    RETURN conv_id;
  END IF;

  SELECT cp1.conversation_id INTO conv_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = _user2 AND cp2.user_id = _user1
  LIMIT 1;

  IF conv_id IS NOT NULL THEN
    RETURN conv_id;
  END IF;

  INSERT INTO conversations DEFAULT VALUES RETURNING id INTO conv_id;
  INSERT INTO conversation_participants (conversation_id, user_id) VALUES (conv_id, _user1);
  INSERT INTO conversation_participants (conversation_id, user_id) VALUES (conv_id, _user2);
  RETURN conv_id;
END;
$$;

-- Fix: calculate_trending_score
CREATE OR REPLACE FUNCTION public.calculate_trending_score(likes integer, comments integer, shares integer, views integer, created_at timestamp with time zone)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  age_hours NUMERIC;
  engagement_score NUMERIC;
  time_decay NUMERIC;
BEGIN
  age_hours := EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600.0;
  engagement_score := (likes * 3) + (comments * 5) + (shares * 7) + (views * 0.1);
  time_decay := POWER(0.5, age_hours / 24.0);
  RETURN engagement_score * time_decay;
END;
$$;

-- Fix: refresh_hot_confessions
CREATE OR REPLACE FUNCTION public.refresh_hot_confessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY hot_confessions;
END;
$$;

-- Fix: update_subscription_entitlements_updated_at
CREATE OR REPLACE FUNCTION public.update_subscription_entitlements_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix: auto_moderate_confession
CREATE OR REPLACE FUNCTION public.auto_moderate_confession()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM user_badges 
    WHERE user_id = NEW.user_id 
    LIMIT 1
  ) THEN
    NEW.moderation_status := 'approved';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix: create_follow_notification
CREATE OR REPLACE FUNCTION public.create_follow_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, triggered_by)
  VALUES (NEW.following_id, 'follow', NEW.follower_id);
  
  RETURN NEW;
END;
$$;

-- Fix: has_valid_consent
CREATE OR REPLACE FUNCTION public.has_valid_consent(_user_id uuid, _consent_type text, _min_version text DEFAULT '1.0')
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_consents
    WHERE user_id = _user_id
      AND consent_type = _consent_type
      AND version >= _min_version
    ORDER BY consented_at DESC
    LIMIT 1
  )
$$;

-- Fix: cleanup_expired_rate_limits
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rate_limits WHERE reset_at < NOW();
END;
$$;

-- Fix: award_coins
CREATE OR REPLACE FUNCTION public.award_coins(_user_id uuid, _amount integer, _type text, _description text DEFAULT NULL, _reference_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_coins (user_id, balance, lifetime_earned)
  VALUES (_user_id, _amount, _amount)
  ON CONFLICT (user_id)
  DO UPDATE SET
    balance = user_coins.balance + _amount,
    lifetime_earned = user_coins.lifetime_earned + _amount,
    updated_at = NOW();
  
  INSERT INTO coin_transactions (user_id, amount, type, description, reference_id)
  VALUES (_user_id, _amount, _type, _description, _reference_id);
END;
$$;

-- Fix: deduct_coins
CREATE OR REPLACE FUNCTION public.deduct_coins(_user_id uuid, _amount integer, _type text, _description text DEFAULT NULL, _reference_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  SELECT balance INTO current_balance
  FROM user_coins
  WHERE user_id = _user_id;
  
  IF current_balance IS NULL OR current_balance < _amount THEN
    RETURN false;
  END IF;
  
  UPDATE user_coins
  SET balance = balance - _amount,
      updated_at = NOW()
  WHERE user_id = _user_id;
  
  INSERT INTO coin_transactions (user_id, amount, type, description, reference_id)
  VALUES (_user_id, -_amount, _type, _description, _reference_id);
  
  RETURN true;
END;
$$;

-- Fix: update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix: award_confession_coins
CREATE OR REPLACE FUNCTION public.award_confession_coins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_draft = FALSE AND NEW.moderation_status = 'approved' THEN
    PERFORM award_coins(NEW.user_id, 2, 'confession_created', 'New confession posted', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Fix: get_hot_confessions
CREATE OR REPLACE FUNCTION public.get_hot_confessions(limit_count integer DEFAULT 50)
RETURNS TABLE(id uuid, content text, category text, user_id uuid, comments_count integer, likes_count integer, ai_response text, ai_deep_insight text, created_at timestamp with time zone, hot_score numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    content,
    category,
    user_id,
    comments_count,
    likes_count,
    ai_response,
    ai_deep_insight,
    created_at,
    hot_score
  FROM hot_confessions
  ORDER BY hot_score DESC
  LIMIT limit_count;
$$;

-- Fix: process_referral_rewards
CREATE OR REPLACE FUNCTION public.process_referral_rewards()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referral_record RECORD;
BEGIN
  IF NEW.is_draft = FALSE AND NEW.moderation_status = 'approved' THEN
    IF NOT EXISTS (
      SELECT 1 FROM confessions 
      WHERE user_id = NEW.user_id 
      AND id != NEW.id 
      AND is_draft = FALSE 
      AND moderation_status = 'approved'
    ) THEN
      SELECT * INTO referral_record
      FROM referrals
      WHERE referred_user_id = NEW.user_id
      AND status = 'completed'
      AND referred_rewarded_at IS NULL
      LIMIT 1;
      
      IF FOUND THEN
        PERFORM award_coins(NEW.user_id, 10, 'referral_bonus', 'First confession bonus', NEW.id);
        PERFORM award_coins(referral_record.referrer_user_id, 20, 'referral_reward', 'Referral reward', NEW.id);
        
        UPDATE referrals
        SET 
          referred_first_confession_at = NOW(),
          referred_rewarded_at = NOW(),
          referrer_rewarded_at = NOW()
        WHERE id = referral_record.id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix: update_profile_counters
CREATE OR REPLACE FUNCTION public.update_profile_counters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'confessions' THEN
    IF TG_OP = 'INSERT' AND NEW.moderation_status = 'approved' AND NEW.is_draft = FALSE THEN
      UPDATE profiles 
      SET posts_count = posts_count + 1
      WHERE user_id = NEW.user_id;
    ELSIF TG_OP = 'DELETE' AND OLD.moderation_status = 'approved' AND OLD.is_draft = FALSE THEN
      UPDATE profiles 
      SET posts_count = GREATEST(0, posts_count - 1)
      WHERE user_id = OLD.user_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'user_follows' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE profiles SET followers_count = followers_count + 1 WHERE user_id = NEW.following_id;
      UPDATE profiles SET following_count = following_count + 1 WHERE user_id = NEW.follower_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE profiles SET followers_count = GREATEST(0, followers_count - 1) WHERE user_id = OLD.following_id;
      UPDATE profiles SET following_count = GREATEST(0, following_count - 1) WHERE user_id = OLD.follower_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix: generate_unique_handle
CREATE OR REPLACE FUNCTION public.generate_unique_handle(base_nickname text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_handle TEXT;
  final_handle TEXT;
  counter INTEGER := 0;
BEGIN
  base_handle := LOWER(REGEXP_REPLACE(base_nickname, '[^a-zA-Z0-9]', '', 'g'));
  base_handle := SUBSTRING(base_handle FROM 1 FOR 20);
  
  final_handle := base_handle;
  
  WHILE EXISTS (SELECT 1 FROM profiles WHERE handle = final_handle) LOOP
    counter := counter + 1;
    final_handle := base_handle || counter::TEXT;
  END LOOP;
  
  RETURN final_handle;
END;
$$;

-- Fix: cleanup_expired_sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth_sessions
  WHERE expires_at < now() AND revoked_at IS NULL;
END;
$$;

-- Fix: cleanup_old_failed_attempts
CREATE OR REPLACE FUNCTION public.cleanup_old_failed_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM failed_login_attempts
  WHERE attempted_at < now() - INTERVAL '30 days';
END;
$$;

-- Fix: is_captcha_required
CREATE OR REPLACE FUNCTION public.is_captcha_required(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM captcha_requirements
    WHERE email = _email
    AND required_until > now()
  );
$$;

-- Fix: get_failed_login_count
CREATE OR REPLACE FUNCTION public.get_failed_login_count(_email text, _minutes integer DEFAULT 15)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM failed_login_attempts
  WHERE email = _email
  AND attempted_at > now() - (_minutes || ' minutes')::INTERVAL;
$$;

-- Fix: revoke_all_user_sessions
CREATE OR REPLACE FUNCTION public.revoke_all_user_sessions(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auth_sessions
  SET revoked_at = now()
  WHERE user_id = _user_id
  AND revoked_at IS NULL;
END;
$$;

-- Fix: log_security_event
CREATE OR REPLACE FUNCTION public.log_security_event(_user_id uuid, _event_type text, _event_data jsonb DEFAULT NULL, _ip_address text DEFAULT NULL, _user_agent text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO security_events (
    user_id,
    event_type,
    event_data,
    ip_address,
    user_agent
  ) VALUES (
    _user_id,
    _event_type,
    _event_data,
    _ip_address,
    _user_agent
  );
END;
$$;

-- Fix: get_daily_confession_count
CREATE OR REPLACE FUNCTION public.get_daily_confession_count(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT count INTO v_count
  FROM daily_confession_counts
  WHERE user_id = _user_id AND date = CURRENT_DATE;
  
  IF v_count IS NULL THEN
    INSERT INTO daily_confession_counts (user_id, date, count)
    VALUES (_user_id, CURRENT_DATE, 0)
    ON CONFLICT (user_id, date) DO NOTHING;
    RETURN 0;
  END IF;
  
  RETURN v_count;
END;
$$;

-- Fix: increment_daily_confession_count
CREATE OR REPLACE FUNCTION public.increment_daily_confession_count(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  INSERT INTO daily_confession_counts (user_id, date, count)
  VALUES (_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET 
    count = daily_confession_counts.count + 1,
    updated_at = NOW()
  RETURNING count INTO v_new_count;
  
  RETURN v_new_count;
END;
$$;

-- Fix: can_user_post_confession
CREATE OR REPLACE FUNCTION public.can_user_post_confession(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_tier TEXT;
  v_limit INTEGER;
  v_can_post BOOLEAN;
BEGIN
  v_count := get_daily_confession_count(_user_id);
  
  SELECT COALESCE(subscription_tier, 'free') INTO v_tier
  FROM profiles
  WHERE user_id = _user_id;
  
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
$$;

-- Fix: create_like_notification
CREATE OR REPLACE FUNCTION public.create_like_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  confession_owner_id UUID;
BEGIN
  SELECT user_id INTO confession_owner_id
  FROM confessions
  WHERE id = NEW.confession_id;
  
  IF confession_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, confession_id, triggered_by)
    VALUES (confession_owner_id, 'like', NEW.confession_id, NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix: create_comment_notification
CREATE OR REPLACE FUNCTION public.create_comment_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  confession_owner_id UUID;
BEGIN
  SELECT user_id INTO confession_owner_id
  FROM confessions
  WHERE id = NEW.confession_id;
  
  IF confession_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, confession_id, triggered_by, comment_content)
    VALUES (confession_owner_id, 'comment', NEW.confession_id, NEW.user_id, NEW.content);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix: handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- Fix: update_confession_likes_count
CREATE OR REPLACE FUNCTION public.update_confession_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE confessions
    SET likes_count = likes_count + 1
    WHERE id = NEW.confession_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE confessions
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.confession_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Fix: update_confession_comments_count
CREATE OR REPLACE FUNCTION public.update_confession_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE confessions
    SET comments_count = comments_count + 1
    WHERE id = NEW.confession_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE confessions
    SET comments_count = GREATEST(0, comments_count - 1)
    WHERE id = OLD.confession_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Fix: is_confession_owner
CREATE OR REPLACE FUNCTION public.is_confession_owner(_user_id uuid, _confession_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM confessions
    WHERE id = _confession_id
      AND user_id = _user_id
  )
$$;