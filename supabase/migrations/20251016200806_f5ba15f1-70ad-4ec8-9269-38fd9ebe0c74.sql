-- Create reports table with detailed categories
CREATE TABLE IF NOT EXISTS confession_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confession_id UUID REFERENCES confessions(id) ON DELETE CASCADE NOT NULL,
  reporter_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE confession_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for reports
CREATE POLICY "Users can create reports"
ON confession_reports FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports"
ON confession_reports FOR SELECT
USING (auth.uid() = reporter_id);

CREATE POLICY "Moderators can view all reports"
ON confession_reports FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') 
  OR public.has_role(auth.uid(), 'moderator')
);

CREATE POLICY "Moderators can update reports"
ON confession_reports FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') 
  OR public.has_role(auth.uid(), 'moderator')
);

-- Create user_blocks table
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- Enable RLS
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- RLS policies for blocks
CREATE POLICY "Users can create blocks"
ON user_blocks FOR INSERT
WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can delete their blocks"
ON user_blocks FOR DELETE
USING (auth.uid() = blocker_id);

CREATE POLICY "Users can view their blocks"
ON user_blocks FOR SELECT
USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

-- Create user_coins table for reward system
CREATE TABLE IF NOT EXISTS user_coins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_coins ENABLE ROW LEVEL SECURITY;

-- RLS policies for coins
CREATE POLICY "Users can view their own coins"
ON user_coins FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their coins"
ON user_coins FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their coins"
ON user_coins FOR UPDATE
USING (auth.uid() = user_id);

-- Create coin_transactions table
CREATE TABLE IF NOT EXISTS coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for transactions
CREATE POLICY "Users can view their transactions"
ON coin_transactions FOR SELECT
USING (auth.uid() = user_id);

-- Trigger for updated_at on user_coins
CREATE TRIGGER update_user_coins_updated_at
BEFORE UPDATE ON user_coins
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to award coins
CREATE OR REPLACE FUNCTION award_coins(
  _user_id UUID,
  _amount INTEGER,
  _type TEXT,
  _description TEXT DEFAULT NULL,
  _reference_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update user_coins
  INSERT INTO user_coins (user_id, balance, lifetime_earned)
  VALUES (_user_id, _amount, _amount)
  ON CONFLICT (user_id)
  DO UPDATE SET
    balance = user_coins.balance + _amount,
    lifetime_earned = user_coins.lifetime_earned + _amount,
    updated_at = NOW();
  
  -- Record transaction
  INSERT INTO coin_transactions (user_id, amount, type, description, reference_id)
  VALUES (_user_id, _amount, _type, _description, _reference_id);
END;
$$;

-- Function to deduct coins
CREATE OR REPLACE FUNCTION deduct_coins(
  _user_id UUID,
  _amount INTEGER,
  _type TEXT,
  _description TEXT DEFAULT NULL,
  _reference_id UUID DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  -- Get current balance
  SELECT balance INTO current_balance
  FROM user_coins
  WHERE user_id = _user_id;
  
  -- Check if user has enough coins
  IF current_balance IS NULL OR current_balance < _amount THEN
    RETURN false;
  END IF;
  
  -- Deduct coins
  UPDATE user_coins
  SET balance = balance - _amount,
      updated_at = NOW()
  WHERE user_id = _user_id;
  
  -- Record transaction
  INSERT INTO coin_transactions (user_id, amount, type, description, reference_id)
  VALUES (_user_id, -_amount, _type, _description, _reference_id);
  
  RETURN true;
END;
$$;

-- Trigger to award coins for new confessions
CREATE OR REPLACE FUNCTION award_confession_coins()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM award_coins(NEW.user_id, 10, 'confession_created', 'Confesiune nouă', NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS award_coins_confession ON confessions;
CREATE TRIGGER award_coins_confession
AFTER INSERT ON confessions
FOR EACH ROW
EXECUTE FUNCTION award_confession_coins();

-- Trigger to award coins for likes received
CREATE OR REPLACE FUNCTION award_like_coins()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  confession_owner UUID;
BEGIN
  -- Get confession owner
  SELECT user_id INTO confession_owner
  FROM confessions
  WHERE id = NEW.confession_id;
  
  -- Award coins to confession owner (not the liker)
  IF confession_owner != NEW.user_id THEN
    PERFORM award_coins(confession_owner, 2, 'like_received', 'Like primit', NEW.confession_id);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS award_coins_like ON user_likes;
CREATE TRIGGER award_coins_like
AFTER INSERT ON user_likes
FOR EACH ROW
EXECUTE FUNCTION award_like_coins();

-- Trigger to award coins for comments
CREATE OR REPLACE FUNCTION award_comment_coins()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM award_coins(NEW.user_id, 5, 'comment_created', 'Comentariu adăugat', NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS award_coins_comment ON comments;
CREATE TRIGGER award_coins_comment
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION award_comment_coins();