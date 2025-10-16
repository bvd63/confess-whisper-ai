-- Badges system
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  requirement_type TEXT NOT NULL, -- 'confessions_count', 'likes_received', 'comments_count', 'streak_days', 'years_active'
  requirement_value INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Reactions system (expandează like-urile)
CREATE TABLE public.confession_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confession_id UUID NOT NULL REFERENCES public.confessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL, -- 'heart', 'sad', 'strong', 'thinking'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(confession_id, user_id, reaction_type)
);

-- Follow system (urmărește utilizatori anonimi)
CREATE TABLE public.user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Streak tracking
CREATE TABLE public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_confession_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mood tracking
CREATE TABLE public.mood_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  confession_id UUID REFERENCES public.confessions(id) ON DELETE CASCADE,
  mood TEXT NOT NULL, -- 'happy', 'sad', 'anxious', 'angry', 'neutral', 'hopeful'
  intensity INTEGER CHECK (intensity >= 1 AND intensity <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily prompts
CREATE TABLE public.daily_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_text TEXT NOT NULL,
  category TEXT NOT NULL,
  active_date DATE NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  theme TEXT DEFAULT 'dark',
  custom_color TEXT,
  font_size TEXT DEFAULT 'medium', -- 'small', 'medium', 'large'
  avatar_seed TEXT, -- for generating consistent anonymous avatars
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns to confessions for image support
ALTER TABLE public.confessions 
ADD COLUMN image_url TEXT,
ADD COLUMN image_blurred BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confession_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for badges
CREATE POLICY "Anyone can view badges" ON public.badges FOR SELECT USING (true);

CREATE POLICY "Users can view all user badges" ON public.user_badges FOR SELECT USING (true);

CREATE POLICY "Users can view their reactions" ON public.confession_reactions 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add reactions" ON public.confession_reactions 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their reactions" ON public.confession_reactions 
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view follows" ON public.user_follows 
  FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Users can create follows" ON public.user_follows 
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete their follows" ON public.user_follows 
  FOR DELETE USING (auth.uid() = follower_id);

CREATE POLICY "Users can view their streak" ON public.user_streaks 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their streak" ON public.user_streaks 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their streak" ON public.user_streaks 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their moods" ON public.mood_entries 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create mood entries" ON public.mood_entries 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view daily prompts" ON public.daily_prompts 
  FOR SELECT USING (true);

CREATE POLICY "Users can view their preferences" ON public.user_preferences 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their preferences" ON public.user_preferences 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their preferences" ON public.user_preferences 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insert initial badges
INSERT INTO public.badges (name, description, icon, requirement_type, requirement_value) VALUES
('Prima Confesiune', 'Ai postat prima ta confesiune', 'MessageSquare', 'confessions_count', 1),
('Confesor Regulat', 'Ai postat 10 confesiuni', 'MessageSquarePlus', 'confessions_count', 10),
('Veteran', 'Ai postat 100 de confesiuni', 'Award', 'confessions_count', 100),
('Popular', 'Ai primit 100 de reacții', 'Heart', 'likes_received', 100),
('Influencer', 'Ai primit 1000 de reacții', 'Star', 'likes_received', 1000),
('Săptămâna de Foc', 'Ai postat 7 zile consecutiv', 'Flame', 'streak_days', 7),
('Luna Perfectă', 'Ai postat 30 de zile consecutiv', 'Trophy', 'streak_days', 30),
('Aniversare', 'Un an pe platformă', 'Cake', 'years_active', 1);

-- Insert daily prompts pentru următoarea săptămână
INSERT INTO public.daily_prompts (prompt_text, category, active_date) VALUES
('Ce lucru te face cu adevărat fericit și de ce?', 'happiness', CURRENT_DATE),
('Dacă ai putea schimba ceva din trecutul tău, ce ai schimba?', 'reflection', CURRENT_DATE + 1),
('Care e cea mai mare teamă a ta și cum te afectează?', 'fears', CURRENT_DATE + 2),
('Descrie un moment când te-ai simțit cu adevărat mândru de tine', 'achievement', CURRENT_DATE + 3),
('Ce sfat i-ai da versiunii tale de acum 5 ani?', 'wisdom', CURRENT_DATE + 4),
('Care e secretul pe care nu l-ai spus niciodată nimănui?', 'secrets', CURRENT_DATE + 5),
('Ce vrei să realizezi în următoarea lună?', 'goals', CURRENT_DATE + 6);

-- Trigger pentru actualizare streak
CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  streak_record RECORD;
  days_diff INTEGER;
BEGIN
  -- Get or create streak record
  SELECT * INTO streak_record FROM public.user_streaks WHERE user_id = NEW.user_id;
  
  IF NOT FOUND THEN
    INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, last_confession_date)
    VALUES (NEW.user_id, 1, 1, CURRENT_DATE);
  ELSE
    days_diff := CURRENT_DATE - streak_record.last_confession_date;
    
    IF days_diff = 0 THEN
      -- Same day, no change
      RETURN NEW;
    ELSIF days_diff = 1 THEN
      -- Consecutive day
      UPDATE public.user_streaks 
      SET current_streak = current_streak + 1,
          longest_streak = GREATEST(longest_streak, current_streak + 1),
          last_confession_date = CURRENT_DATE,
          updated_at = NOW()
      WHERE user_id = NEW.user_id;
    ELSE
      -- Streak broken
      UPDATE public.user_streaks 
      SET current_streak = 1,
          last_confession_date = CURRENT_DATE,
          updated_at = NOW()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER confession_streak_trigger
AFTER INSERT ON public.confessions
FOR EACH ROW
EXECUTE FUNCTION update_user_streak();

-- Function pentru verificare și acordare badge-uri
CREATE OR REPLACE FUNCTION check_and_award_badges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  badge_record RECORD;
  user_stat INTEGER;
BEGIN
  FOR badge_record IN SELECT * FROM public.badges LOOP
    -- Check if user already has this badge
    IF NOT EXISTS (
      SELECT 1 FROM public.user_badges 
      WHERE user_id = NEW.user_id AND badge_id = badge_record.id
    ) THEN
      user_stat := 0;
      
      -- Calculate user stat based on requirement type
      CASE badge_record.requirement_type
        WHEN 'confessions_count' THEN
          SELECT COUNT(*) INTO user_stat FROM public.confessions WHERE user_id = NEW.user_id;
        WHEN 'likes_received' THEN
          SELECT SUM(c.likes_count) INTO user_stat 
          FROM public.confessions c WHERE c.user_id = NEW.user_id;
        WHEN 'streak_days' THEN
          SELECT current_streak INTO user_stat 
          FROM public.user_streaks WHERE user_id = NEW.user_id;
        WHEN 'years_active' THEN
          SELECT EXTRACT(YEAR FROM AGE(NOW(), created_at)) INTO user_stat
          FROM public.profiles WHERE user_id = NEW.user_id;
      END CASE;
      
      -- Award badge if requirement met
      IF user_stat >= badge_record.requirement_value THEN
        INSERT INTO public.user_badges (user_id, badge_id)
        VALUES (NEW.user_id, badge_record.id);
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_badges_on_confession
AFTER INSERT ON public.confessions
FOR EACH ROW
EXECUTE FUNCTION check_and_award_badges();

CREATE TRIGGER check_badges_on_streak
AFTER UPDATE ON public.user_streaks
FOR EACH ROW
EXECUTE FUNCTION check_and_award_badges();