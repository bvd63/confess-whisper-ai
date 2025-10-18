-- Create communities table
CREATE TABLE IF NOT EXISTS public.communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  icon TEXT,
  cover_image TEXT,
  is_private BOOLEAN DEFAULT false,
  member_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create community members table
CREATE TABLE IF NOT EXISTS public.community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- member, moderator, admin
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(community_id, user_id)
);

-- Add location fields to confessions
ALTER TABLE public.confessions 
ADD COLUMN IF NOT EXISTS location_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS location_lng DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_city TEXT,
ADD COLUMN IF NOT EXISTS location_country TEXT,
ADD COLUMN IF NOT EXISTS community_id UUID REFERENCES public.communities(id) ON DELETE SET NULL;

-- Create index for location queries
CREATE INDEX IF NOT EXISTS idx_confessions_location ON public.confessions(location_lat, location_lng) WHERE location_enabled = true;
CREATE INDEX IF NOT EXISTS idx_confessions_community ON public.confessions(community_id) WHERE community_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_community_members_user ON public.community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_members_community ON public.community_members(community_id);

-- Enable RLS
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for communities
CREATE POLICY "Anyone can view public communities"
  ON public.communities FOR SELECT
  USING (is_private = false OR id IN (
    SELECT community_id FROM community_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Authenticated users can create communities"
  ON public.communities FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Community admins can update"
  ON public.communities FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM community_members 
    WHERE community_id = communities.id 
    AND user_id = auth.uid() 
    AND role IN ('admin', 'moderator')
  ));

-- RLS Policies for community members
CREATE POLICY "Anyone can view community members"
  ON public.community_members FOR SELECT
  USING (true);

CREATE POLICY "Users can join communities"
  ON public.community_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave communities"
  ON public.community_members FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Community admins can manage members"
  ON public.community_members FOR ALL
  USING (EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = community_members.community_id
    AND cm.user_id = auth.uid()
    AND cm.role = 'admin'
  ));

-- Function to update community member count
CREATE OR REPLACE FUNCTION update_community_member_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
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

CREATE TRIGGER update_community_member_count_trigger
  AFTER INSERT OR DELETE ON community_members
  FOR EACH ROW EXECUTE FUNCTION update_community_member_count();

-- Function to update community post count
CREATE OR REPLACE FUNCTION update_community_post_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
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

CREATE TRIGGER update_community_post_count_trigger
  AFTER INSERT OR DELETE OR UPDATE OF community_id, moderation_status ON confessions
  FOR EACH ROW EXECUTE FUNCTION update_community_post_count();