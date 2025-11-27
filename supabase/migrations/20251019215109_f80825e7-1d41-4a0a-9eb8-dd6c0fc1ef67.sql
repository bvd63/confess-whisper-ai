-- Create daily confession tracking table
CREATE TABLE IF NOT EXISTS public.daily_confession_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.daily_confession_counts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own confession counts"
  ON public.daily_confession_counts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own confession counts"
  ON public.daily_confession_counts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own confession counts"
  ON public.daily_confession_counts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_daily_confession_counts_user_date 
  ON public.daily_confession_counts(user_id, date);

-- Function to get or create today's count
CREATE OR REPLACE FUNCTION public.get_daily_confession_count(_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT count INTO v_count
  FROM public.daily_confession_counts
  WHERE user_id = _user_id AND date = CURRENT_DATE;
  
  IF v_count IS NULL THEN
    INSERT INTO public.daily_confession_counts (user_id, date, count)
    VALUES (_user_id, CURRENT_DATE, 0)
    ON CONFLICT (user_id, date) DO NOTHING;
    RETURN 0;
  END IF;
  
  RETURN v_count;
END;
$$;

-- Function to increment confession count
CREATE OR REPLACE FUNCTION public.increment_daily_confession_count(_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  INSERT INTO public.daily_confession_counts (user_id, date, count)
  VALUES (_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET 
    count = daily_confession_counts.count + 1,
    updated_at = NOW()
  RETURNING count INTO v_new_count;
  
  RETURN v_new_count;
END;
$$;

-- Function to check if user can post (based on subscription tier)
CREATE OR REPLACE FUNCTION public.can_user_post_confession(_user_id UUID)
RETURNS JSONB
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
  -- Get current count
  v_count := get_daily_confession_count(_user_id);
  
  -- Get user's subscription tier
  SELECT COALESCE(subscription_tier, 'free') INTO v_tier
  FROM public.profiles
  WHERE user_id = _user_id;
  
  -- Determine limit based on tier
  CASE v_tier
    WHEN 'free' THEN v_limit := 5;
    WHEN 'premium' THEN v_limit := 10;
    WHEN 'vip' THEN v_limit := -1; -- unlimited
    ELSE v_limit := 5;
  END CASE;
  
  -- Check if can post
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