-- Create user_likes table to track likes per user
CREATE TABLE public.user_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  confession_id UUID NOT NULL REFERENCES public.confessions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, confession_id)
);

-- Enable RLS
ALTER TABLE public.user_likes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own likes"
ON public.user_likes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own likes"
ON public.user_likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
ON public.user_likes
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_user_likes_user_id ON public.user_likes(user_id);
CREATE INDEX idx_user_likes_confession_id ON public.user_likes(confession_id);

-- Create function to update likes count
CREATE OR REPLACE FUNCTION public.update_confession_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.confessions
    SET likes_count = likes_count + 1
    WHERE id = NEW.confession_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.confessions
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.confession_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic likes count updates
CREATE TRIGGER trigger_update_likes_count
AFTER INSERT OR DELETE ON public.user_likes
FOR EACH ROW
EXECUTE FUNCTION public.update_confession_likes_count();