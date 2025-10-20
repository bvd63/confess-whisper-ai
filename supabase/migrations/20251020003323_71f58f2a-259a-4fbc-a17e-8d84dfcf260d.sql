-- Add tier restrictions to profile_flairs and populate with sample items
ALTER TABLE public.profile_flairs 
  ADD COLUMN IF NOT EXISTS required_plan TEXT DEFAULT 'free' CHECK (required_plan IN ('free', 'premium', 'vip'));

-- Add fields to user_flairs for visibility control
ALTER TABLE public.user_flairs 
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Add fields to user_badges for visibility control
ALTER TABLE public.user_badges 
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Create index for featured items
CREATE INDEX IF NOT EXISTS idx_user_flairs_featured ON public.user_flairs(user_id, is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_user_badges_featured ON public.user_badges(user_id, is_featured) WHERE is_featured = true;

-- Clear existing flairs to start fresh
DELETE FROM public.profile_flairs;

-- Insert sample flairs following 3/4/3 model
-- Items 1-3: Available to all (Free/Premium/VIP)
INSERT INTO public.profile_flairs (name_key, icon, rarity, cost, required_plan) VALUES
  ('flair_sparkle', '✨', 'common', 50, 'free'),
  ('flair_star', '⭐', 'common', 50, 'free'),
  ('flair_heart', '❤️', 'common', 50, 'free'),
  
-- Items 4-7: Premium/VIP only
  ('flair_crown', '👑', 'rare', 100, 'premium'),
  ('flair_gem', '💎', 'rare', 100, 'premium'),
  ('flair_fire', '🔥', 'rare', 100, 'premium'),
  ('flair_rocket', '🚀', 'rare', 100, 'premium'),
  
-- Items 8-10: VIP only
  ('flair_trophy', '🏆', 'legendary', 200, 'vip'),
  ('flair_lightning', '⚡', 'legendary', 200, 'vip'),
  ('flair_magic', '🪄', 'legendary', 200, 'vip')
ON CONFLICT DO NOTHING;

-- Add comment for documentation
COMMENT ON COLUMN public.profile_flairs.required_plan IS 'Minimum subscription tier required to purchase this flair: free, premium, or vip';