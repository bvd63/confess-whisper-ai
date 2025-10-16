-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Add moderation fields to confessions
ALTER TABLE confessions
ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS moderated_by UUID,
ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;

-- Create moderation_logs table
CREATE TABLE IF NOT EXISTS moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confession_id UUID REFERENCES confessions(id) ON DELETE CASCADE,
  moderator_id UUID NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for moderation_logs
CREATE POLICY "Moderators and admins can view logs"
ON moderation_logs FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') 
  OR public.has_role(auth.uid(), 'moderator')
);

CREATE POLICY "Moderators and admins can insert logs"
ON moderation_logs FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin') 
  OR public.has_role(auth.uid(), 'moderator')
);

-- Update notifications to include more types
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'follow';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'badge_earned';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'streak_milestone';

-- Create function to auto-moderate content
CREATE OR REPLACE FUNCTION auto_moderate_confession()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-approve if user has good standing
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

-- Trigger for auto-moderation
DROP TRIGGER IF EXISTS auto_moderate_new_confession ON confessions;
CREATE TRIGGER auto_moderate_new_confession
BEFORE INSERT ON confessions
FOR EACH ROW
EXECUTE FUNCTION auto_moderate_confession();

-- Create notification for new followers
CREATE OR REPLACE FUNCTION create_follow_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, triggered_by)
  VALUES (NEW.following_id, 'follow', NEW.follower_id);
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_new_follower ON user_follows;
CREATE TRIGGER notify_new_follower
AFTER INSERT ON user_follows
FOR EACH ROW
EXECUTE FUNCTION create_follow_notification();