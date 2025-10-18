-- Add expires_at to user_badges
ALTER TABLE user_badges ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_badges ADD COLUMN IF NOT EXISTS acquired_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add expires_at to user_flairs
ALTER TABLE user_flairs ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_flairs ADD COLUMN IF NOT EXISTS acquired_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update referrals table to track rewards
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referrer_rewarded_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referred_rewarded_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referred_first_confession_at TIMESTAMP WITH TIME ZONE;

-- Drop old coin reward functions (this will automatically drop their triggers)
DROP FUNCTION IF EXISTS award_like_coins() CASCADE;
DROP FUNCTION IF EXISTS award_comment_coins() CASCADE;

-- Update confession coin reward to give 2 coins instead of 10
CREATE OR REPLACE FUNCTION public.award_confession_coins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only award coins for new, non-draft, approved confessions
  IF NEW.is_draft = FALSE AND NEW.moderation_status = 'approved' THEN
    PERFORM award_coins(NEW.user_id, 2, 'confession_created', 'New confession posted', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create function to handle referral rewards on first confession
CREATE OR REPLACE FUNCTION public.process_referral_rewards()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referral_record RECORD;
BEGIN
  -- Only process for new, non-draft, approved confessions
  IF NEW.is_draft = FALSE AND NEW.moderation_status = 'approved' THEN
    -- Check if this is user's first confession and they were referred
    IF NOT EXISTS (
      SELECT 1 FROM confessions 
      WHERE user_id = NEW.user_id 
      AND id != NEW.id 
      AND is_draft = FALSE 
      AND moderation_status = 'approved'
    ) THEN
      -- Find referral record where this user was referred
      SELECT * INTO referral_record
      FROM referrals
      WHERE referred_user_id = NEW.user_id
      AND status = 'completed'
      AND referred_rewarded_at IS NULL
      LIMIT 1;
      
      IF FOUND THEN
        -- Award 10 coins to referred user
        PERFORM award_coins(NEW.user_id, 10, 'referral_bonus', 'First confession bonus', NEW.id);
        
        -- Award 20 coins to referrer
        PERFORM award_coins(referral_record.referrer_user_id, 20, 'referral_reward', 'Referral reward', NEW.id);
        
        -- Update referral record
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

-- Create trigger for referral rewards
DROP TRIGGER IF EXISTS process_referral_rewards_trigger ON confessions;
CREATE TRIGGER process_referral_rewards_trigger
  AFTER INSERT ON confessions
  FOR EACH ROW
  EXECUTE FUNCTION process_referral_rewards();

-- Create function to check badge/flair expiry
CREATE OR REPLACE FUNCTION public.is_badge_active(acquired_at TIMESTAMP WITH TIME ZONE, expires_at TIMESTAMP WITH TIME ZONE)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT expires_at IS NULL OR expires_at > NOW();
$$;

-- Create index for faster expiry checks
CREATE INDEX IF NOT EXISTS idx_user_badges_expires_at ON user_badges(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_flairs_expires_at ON user_flairs(expires_at) WHERE expires_at IS NOT NULL;