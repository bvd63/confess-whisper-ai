-- QOTD (Quote of the Day) System
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text_en TEXT NOT NULL,
  text_es TEXT NOT NULL,
  text_de TEXT NOT NULL,
  author TEXT,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.app_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert initial QOTD state
INSERT INTO public.app_state (key, value) 
VALUES ('quote_of_the_day', '{"quote_id": null, "rotated_at": null}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Notification soft delete enhancement
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notifications_deleted_at 
ON public.notifications(deleted_at) 
WHERE deleted_at IS NOT NULL;

-- User profiles enhancements for public profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS handle TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS privacy_mode TEXT DEFAULT 'public' CHECK (privacy_mode IN ('public', 'limited', 'private')),
ADD COLUMN IF NOT EXISTS is_shadow_banned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_profiles_handle ON public.profiles(handle);

-- Message enhancements for DMs
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.message_typing_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_typing BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Conversation mute/block
ALTER TABLE public.conversation_participants
ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_confessions_created_at_desc 
ON public.confessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_confessions_user_created 
ON public.confessions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_confession_created 
ON public.comments(confession_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower 
ON public.user_follows(follower_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_follows_following 
ON public.user_follows(following_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
ON public.notifications(user_id, created_at DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON public.messages(conversation_id, created_at DESC);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_confessions_content_search 
ON public.confessions USING gin(to_tsvector('english', content));

CREATE INDEX IF NOT EXISTS idx_profiles_nickname_search 
ON public.profiles USING gin(to_tsvector('english', nickname));

-- User post counts view
CREATE OR REPLACE VIEW public.user_post_counts AS
SELECT 
  user_id,
  COUNT(*) as post_count,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as posts_this_week,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as posts_this_month
FROM public.confessions
WHERE moderation_status = 'approved'
  AND is_draft = FALSE
GROUP BY user_id;

-- RLS policies for new tables
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_typing_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view quotes"
ON public.quotes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Anyone can view app state"
ON public.app_state FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can view typing status in their conversations"
ON public.message_typing_status FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = message_typing_status.conversation_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own typing status"
ON public.message_typing_status FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Function to update profile counters
CREATE OR REPLACE FUNCTION public.update_profile_counters()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'confessions' THEN
    IF TG_OP = 'INSERT' AND NEW.moderation_status = 'approved' AND NEW.is_draft = FALSE THEN
      UPDATE public.profiles 
      SET posts_count = posts_count + 1
      WHERE user_id = NEW.user_id;
    ELSIF TG_OP = 'DELETE' AND OLD.moderation_status = 'approved' AND OLD.is_draft = FALSE THEN
      UPDATE public.profiles 
      SET posts_count = GREATEST(0, posts_count - 1)
      WHERE user_id = OLD.user_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'user_follows' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.profiles SET followers_count = followers_count + 1 WHERE user_id = NEW.following_id;
      UPDATE public.profiles SET following_count = following_count + 1 WHERE user_id = NEW.follower_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.profiles SET followers_count = GREATEST(0, followers_count - 1) WHERE user_id = OLD.following_id;
      UPDATE public.profiles SET following_count = GREATEST(0, following_count - 1) WHERE user_id = OLD.follower_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers for counter updates
DROP TRIGGER IF EXISTS update_confession_counters ON public.confessions;
CREATE TRIGGER update_confession_counters
AFTER INSERT OR DELETE ON public.confessions
FOR EACH ROW EXECUTE FUNCTION public.update_profile_counters();

DROP TRIGGER IF EXISTS update_follow_counters ON public.user_follows;
CREATE TRIGGER update_follow_counters
AFTER INSERT OR DELETE ON public.user_follows
FOR EACH ROW EXECUTE FUNCTION public.update_profile_counters();

-- Function to generate unique handle from nickname
CREATE OR REPLACE FUNCTION public.generate_unique_handle(base_nickname TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_handle TEXT;
  final_handle TEXT;
  counter INTEGER := 0;
BEGIN
  -- Sanitize nickname to create base handle
  base_handle := LOWER(REGEXP_REPLACE(base_nickname, '[^a-zA-Z0-9]', '', 'g'));
  base_handle := SUBSTRING(base_handle FROM 1 FOR 20);
  
  -- Try base handle first
  final_handle := base_handle;
  
  -- If taken, append numbers until unique
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE handle = final_handle) LOOP
    counter := counter + 1;
    final_handle := base_handle || counter::TEXT;
  END LOOP;
  
  RETURN final_handle;
END;
$$;

-- Seed initial quotes
INSERT INTO public.quotes (text_en, text_es, text_de, author, category) VALUES
('The only way to do great work is to love what you do.', 'La única forma de hacer un gran trabajo es amar lo que haces.', 'Der einzige Weg, großartige Arbeit zu leisten, ist zu lieben, was du tust.', 'Steve Jobs', 'motivation'),
('Life is what happens when you''re busy making other plans.', 'La vida es lo que sucede mientras estás ocupado haciendo otros planes.', 'Leben ist das, was passiert, während du damit beschäftigt bist, andere Pläne zu machen.', 'John Lennon', 'life'),
('The future belongs to those who believe in the beauty of their dreams.', 'El futuro pertenece a quienes creen en la belleza de sus sueños.', 'Die Zukunft gehört denen, die an die Schönheit ihrer Träume glauben.', 'Eleanor Roosevelt', 'inspiration'),
('It is during our darkest moments that we must focus to see the light.', 'Es en nuestros momentos más oscuros cuando debemos enfocarnos para ver la luz.', 'In unseren dunkelsten Momenten müssen wir uns darauf konzentrieren, das Licht zu sehen.', 'Aristotle', 'wisdom'),
('Be yourself; everyone else is already taken.', 'Sé tú mismo; todos los demás ya están ocupados.', 'Sei du selbst; alle anderen sind bereits vergeben.', 'Oscar Wilde', 'self'),
('You only live once, but if you do it right, once is enough.', 'Solo vives una vez, pero si lo haces bien, una vez es suficiente.', 'Man lebt nur einmal, aber wenn man es richtig macht, reicht einmal.', 'Mae West', 'life'),
('In the end, we only regret the chances we didn''t take.', 'Al final, solo lamentamos las oportunidades que no tomamos.', 'Am Ende bereuen wir nur die Chancen, die wir nicht ergriffen haben.', 'Unknown', 'courage'),
('Happiness is not something ready made. It comes from your own actions.', 'La felicidad no es algo prefabricado. Viene de tus propias acciones.', 'Glück ist nichts Fertiges. Es kommt aus deinen eigenen Handlungen.', 'Dalai Lama', 'happiness')
ON CONFLICT DO NOTHING;