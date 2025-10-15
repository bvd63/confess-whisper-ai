-- Create notification types enum
CREATE TYPE public.notification_type AS ENUM ('like', 'comment', 'deep_insight');

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type public.notification_type NOT NULL,
  confession_id UUID NOT NULL REFERENCES public.confessions(id) ON DELETE CASCADE,
  triggered_by UUID,
  comment_content TEXT,
  is_read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Function to create notification for likes
CREATE OR REPLACE FUNCTION public.create_like_notification()
RETURNS TRIGGER AS $$
DECLARE
  confession_owner_id UUID;
BEGIN
  -- Get the owner of the confession
  SELECT user_id INTO confession_owner_id
  FROM public.confessions
  WHERE id = NEW.confession_id;
  
  -- Don't create notification if user likes their own confession
  IF confession_owner_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, confession_id, triggered_by)
    VALUES (confession_owner_id, 'like', NEW.confession_id, NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to create notification for comments
CREATE OR REPLACE FUNCTION public.create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  confession_owner_id UUID;
BEGIN
  -- Get the owner of the confession
  SELECT user_id INTO confession_owner_id
  FROM public.confessions
  WHERE id = NEW.confession_id;
  
  -- Don't create notification if user comments on their own confession
  IF confession_owner_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, confession_id, triggered_by, comment_content)
    VALUES (confession_owner_id, 'comment', NEW.confession_id, NEW.user_id, NEW.content);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers
CREATE TRIGGER trigger_like_notification
AFTER INSERT ON public.user_likes
FOR EACH ROW
EXECUTE FUNCTION public.create_like_notification();

CREATE TRIGGER trigger_comment_notification
AFTER INSERT ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.create_comment_notification();