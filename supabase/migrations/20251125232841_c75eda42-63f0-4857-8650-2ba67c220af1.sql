-- Create confession_awards table to store awards given to confessions
CREATE TABLE IF NOT EXISTS public.confession_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confession_id UUID NOT NULL REFERENCES public.confessions(id) ON DELETE CASCADE,
  giver_id UUID NOT NULL,
  award_type TEXT NOT NULL CHECK (award_type IN ('star', 'heart', 'fire', 'diamond')),
  coins_spent INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on confession_awards
ALTER TABLE public.confession_awards ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view awards
CREATE POLICY "Anyone can view awards"
  ON public.confession_awards
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can give awards
CREATE POLICY "Authenticated users can give awards"
  ON public.confession_awards
  FOR INSERT
  WITH CHECK (auth.uid() = giver_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_confession_awards_confession_id ON public.confession_awards(confession_id);
CREATE INDEX IF NOT EXISTS idx_confession_awards_giver_id ON public.confession_awards(giver_id);

-- Create give_award RPC function
CREATE OR REPLACE FUNCTION public.give_award(
  confession_id UUID,
  award_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_giver_id UUID;
  v_creator_id UUID;
  v_award_cost INTEGER;
  v_creator_earnings INTEGER;
  v_giver_balance INTEGER;
BEGIN
  -- Get current user
  v_giver_id := auth.uid();
  IF v_giver_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get confession creator
  SELECT user_id INTO v_creator_id
  FROM confessions
  WHERE id = confession_id;

  IF v_creator_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Confession not found');
  END IF;

  -- Don't allow awarding own confession
  IF v_giver_id = v_creator_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot award own confession');
  END IF;

  -- Determine award cost
  v_award_cost := CASE award_type
    WHEN 'star' THEN 50
    WHEN 'heart' THEN 100
    WHEN 'fire' THEN 150
    WHEN 'diamond' THEN 300
    ELSE 0
  END;

  IF v_award_cost = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid award type');
  END IF;

  -- Check giver balance
  SELECT balance INTO v_giver_balance
  FROM user_coins
  WHERE user_id = v_giver_id;

  IF v_giver_balance IS NULL OR v_giver_balance < v_award_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient coins');
  END IF;

  -- Calculate creator earnings (50%)
  v_creator_earnings := FLOOR(v_award_cost / 2);

  -- Deduct coins from giver
  UPDATE user_coins
  SET balance = balance - v_award_cost,
      updated_at = NOW()
  WHERE user_id = v_giver_id;

  -- Credit creator
  INSERT INTO user_coins (user_id, balance, lifetime_earned)
  VALUES (v_creator_id, v_creator_earnings, v_creator_earnings)
  ON CONFLICT (user_id)
  DO UPDATE SET
    balance = user_coins.balance + v_creator_earnings,
    lifetime_earned = user_coins.lifetime_earned + v_creator_earnings,
    updated_at = NOW();

  -- Record award
  INSERT INTO confession_awards (confession_id, giver_id, award_type, coins_spent)
  VALUES (confession_id, v_giver_id, award_type, v_award_cost);

  -- Record giver transaction
  INSERT INTO coin_transactions (user_id, amount, type, description, reference_id)
  VALUES (v_giver_id, -v_award_cost, 'award_given', 'Gave ' || award_type || ' award', confession_id);

  -- Record creator transaction
  INSERT INTO coin_transactions (user_id, amount, type, description, reference_id)
  VALUES (v_creator_id, v_creator_earnings, 'award_received', 'Received ' || award_type || ' award', confession_id);

  RETURN jsonb_build_object(
    'success', true,
    'coins_spent', v_award_cost,
    'creator_earned', v_creator_earnings
  );
END;
$$;

-- Create gift_coins RPC function
CREATE OR REPLACE FUNCTION public.gift_coins(
  receiver_id UUID,
  amount INTEGER,
  is_anonymous BOOLEAN DEFAULT false,
  message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id UUID;
  v_fee INTEGER;
  v_anonymous_fee INTEGER;
  v_total_cost INTEGER;
  v_sender_balance INTEGER;
BEGIN
  -- Get current user
  v_sender_id := auth.uid();
  IF v_sender_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Validate amount
  IF amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid amount');
  END IF;

  -- Don't allow gifting to self
  IF v_sender_id = receiver_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot gift coins to yourself');
  END IF;

  -- Calculate fees
  v_fee := CEIL(amount * 0.05); -- 5% platform fee
  v_anonymous_fee := CASE WHEN is_anonymous THEN 50 ELSE 0 END;
  v_total_cost := amount + v_fee + v_anonymous_fee;

  -- Check sender balance
  SELECT balance INTO v_sender_balance
  FROM user_coins
  WHERE user_id = v_sender_id;

  IF v_sender_balance IS NULL OR v_sender_balance < v_total_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient coins');
  END IF;

  -- Deduct from sender
  UPDATE user_coins
  SET balance = balance - v_total_cost,
      updated_at = NOW()
  WHERE user_id = v_sender_id;

  -- Credit receiver
  INSERT INTO user_coins (user_id, balance, lifetime_earned)
  VALUES (receiver_id, amount, amount)
  ON CONFLICT (user_id)
  DO UPDATE SET
    balance = user_coins.balance + amount,
    lifetime_earned = user_coins.lifetime_earned + amount,
    updated_at = NOW();

  -- Record sender transaction
  INSERT INTO coin_transactions (user_id, amount, type, description, reference_id)
  VALUES (
    v_sender_id,
    -v_total_cost,
    'gift_sent',
    CASE 
      WHEN is_anonymous THEN 'Sent anonymous gift'
      ELSE 'Sent gift to user'
    END || COALESCE(' - ' || message, ''),
    receiver_id
  );

  -- Record receiver transaction
  INSERT INTO coin_transactions (user_id, amount, type, description, reference_id)
  VALUES (
    receiver_id,
    amount,
    'gift_received',
    CASE 
      WHEN is_anonymous THEN 'Received anonymous gift'
      ELSE 'Received gift'
    END || COALESCE(' - ' || message, ''),
    v_sender_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'amount_sent', amount,
    'total_cost', v_total_cost,
    'fee', v_fee + v_anonymous_fee
  );
END;
$$;