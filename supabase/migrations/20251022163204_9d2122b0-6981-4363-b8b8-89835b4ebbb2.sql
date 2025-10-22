-- Fix award_coins function to accept session_id as TEXT instead of UUID
DROP FUNCTION IF EXISTS award_coins(uuid, integer, text);

CREATE OR REPLACE FUNCTION award_coins(
  p_user_id UUID,
  p_amount INTEGER,
  p_session_id TEXT,
  p_description TEXT DEFAULT 'Coin purchase'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INTEGER;
  v_transaction_id UUID;
BEGIN
  -- Check for duplicate transaction using session_id (stored as reference_id)
  IF EXISTS (
    SELECT 1 FROM coin_transactions 
    WHERE reference_id::text = p_session_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'duplicate_transaction',
      'message', 'Coins already awarded for this purchase'
    );
  END IF;

  -- Insert or update user_coins
  INSERT INTO user_coins (user_id, balance, lifetime_earned)
  VALUES (p_user_id, p_amount, p_amount)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    balance = user_coins.balance + p_amount,
    lifetime_earned = user_coins.lifetime_earned + p_amount,
    updated_at = NOW()
  RETURNING balance INTO v_new_balance;

  -- Record transaction - cast session_id to UUID for storage
  -- We'll generate a UUID for the transaction and store session_id in description
  INSERT INTO coin_transactions (
    user_id,
    amount,
    type,
    description,
    reference_id
  ) VALUES (
    p_user_id,
    p_amount,
    'purchase',
    p_description || ' - Session: ' || p_session_id,
    gen_random_uuid()  -- Generate a proper UUID for reference_id
  ) RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'transaction_id', v_transaction_id,
    'coins_awarded', p_amount
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;