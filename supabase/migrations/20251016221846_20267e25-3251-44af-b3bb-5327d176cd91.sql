-- Add new badges to the database
INSERT INTO public.badges (name, description, icon, requirement_type, requirement_value) VALUES
('Comentator Activ', 'A postat 50 de comentarii', 'MessageSquare', 'comments_count', 50),
('Împărtășitor', 'A distribuit 25 de confesiuni', 'Share', 'shares_given', 25),
('Cititor Avid', 'A vizualizat 200 de confesiuni', 'Eye', 'views_count', 200),
('Colecționar', 'A salvat 30 de bookmark-uri', 'Bookmark', 'bookmarks_count', 30),
('Nocturn', 'A postat 20 de confesiuni între 22:00-6:00', 'Moon', 'night_confessions', 20),
('Social Butterfly', 'Are 20 de urmăritori', 'Users', 'followers_count', 20),
('Confesiune Virală', 'Are o confesiune cu 100+ likes', 'TrendingUp', 'viral_confession', 100);

-- Update the check_and_award_badges function to handle new badge types
CREATE OR REPLACE FUNCTION public.check_and_award_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
        WHEN 'comments_count' THEN
          SELECT COUNT(*) INTO user_stat FROM public.comments WHERE user_id = NEW.user_id;
        WHEN 'shares_given' THEN
          SELECT SUM(shared_count) INTO user_stat FROM public.confessions WHERE user_id = NEW.user_id;
        WHEN 'views_count' THEN
          -- Count total views of confessions created by others that this user might have viewed
          -- This is a placeholder - you might want to create a views tracking table
          user_stat := 0;
        WHEN 'bookmarks_count' THEN
          SELECT COUNT(*) INTO user_stat FROM public.bookmarks WHERE user_id = NEW.user_id;
        WHEN 'night_confessions' THEN
          SELECT COUNT(*) INTO user_stat 
          FROM public.confessions 
          WHERE user_id = NEW.user_id 
          AND (EXTRACT(HOUR FROM created_at) >= 22 OR EXTRACT(HOUR FROM created_at) < 6);
        WHEN 'followers_count' THEN
          SELECT COUNT(*) INTO user_stat FROM public.user_follows WHERE following_id = NEW.user_id;
        WHEN 'viral_confession' THEN
          SELECT MAX(likes_count) INTO user_stat FROM public.confessions WHERE user_id = NEW.user_id;
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
$function$;