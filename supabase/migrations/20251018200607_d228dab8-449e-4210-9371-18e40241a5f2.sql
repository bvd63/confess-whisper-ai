-- Create tables for confession boosts
CREATE TABLE IF NOT EXISTS public.confession_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confession_id UUID NOT NULL REFERENCES public.confessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  boost_until TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_confession_boosts_confession_id ON public.confession_boosts(confession_id);
CREATE INDEX IF NOT EXISTS idx_confession_boosts_boost_until ON public.confession_boosts(boost_until);
CREATE INDEX IF NOT EXISTS idx_confession_boosts_user_id ON public.confession_boosts(user_id);

-- Enable RLS
ALTER TABLE public.confession_boosts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for confession_boosts
CREATE POLICY "Anyone can view active boosts"
  ON public.confession_boosts
  FOR SELECT
  USING (boost_until > NOW());

CREATE POLICY "Users can boost their own confessions"
  ON public.confession_boosts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create table for profile flairs (purchasable badges)
CREATE TABLE IF NOT EXISTS public.profile_flairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_key TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL,
  cost INTEGER NOT NULL DEFAULT 30,
  rarity TEXT NOT NULL DEFAULT 'common',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS for profile_flairs
ALTER TABLE public.profile_flairs ENABLE ROW LEVEL SECURITY;

-- RLS Policy for profile_flairs
CREATE POLICY "Anyone can view active flairs"
  ON public.profile_flairs
  FOR SELECT
  USING (is_active = TRUE);

-- Create table for user-owned flairs
CREATE TABLE IF NOT EXISTS public.user_flairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  flair_id UUID NOT NULL REFERENCES public.profile_flairs(id) ON DELETE CASCADE,
  is_equipped BOOLEAN NOT NULL DEFAULT FALSE,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, flair_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_flairs_user_id ON public.user_flairs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_flairs_flair_id ON public.user_flairs(flair_id);

-- Enable RLS for user_flairs
ALTER TABLE public.user_flairs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_flairs
CREATE POLICY "Users can view their own flairs"
  ON public.user_flairs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view flairs of others"
  ON public.user_flairs
  FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can purchase flairs"
  ON public.user_flairs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can equip/unequip their flairs"
  ON public.user_flairs
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Insert default flairs
INSERT INTO public.profile_flairs (name_key, icon, cost, rarity) VALUES
  ('flair_star', '⭐', 30, 'common'),
  ('flair_fire', '🔥', 30, 'common'),
  ('flair_heart', '❤️', 30, 'common'),
  ('flair_crown', '👑', 50, 'rare'),
  ('flair_sparkles', '✨', 30, 'common'),
  ('flair_diamond', '💎', 75, 'epic'),
  ('flair_trophy', '🏆', 50, 'rare'),
  ('flair_rocket', '🚀', 40, 'uncommon'),
  ('flair_rainbow', '🌈', 40, 'uncommon'),
  ('flair_unicorn', '🦄', 75, 'epic')
ON CONFLICT (name_key) DO NOTHING;