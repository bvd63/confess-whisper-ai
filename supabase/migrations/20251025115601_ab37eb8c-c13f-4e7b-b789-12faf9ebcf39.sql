-- ============================================
-- FEATURE 1: STREAKS & REWARDS ENHANCEMENTS  
-- ============================================

-- Add points and level system to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS dominant_tone VARCHAR(20),
ADD COLUMN IF NOT EXISTS tone_history JSONB DEFAULT '[]';

-- Add emotional tone to confessions
ALTER TABLE confessions 
ADD COLUMN IF NOT EXISTS emotional_tone VARCHAR(20);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_points ON profiles(total_points);
CREATE INDEX IF NOT EXISTS idx_profiles_level ON profiles(level);
CREATE INDEX IF NOT EXISTS idx_confessions_tone ON confessions(emotional_tone);

-- Add multilingual columns to badges table
ALTER TABLE badges 
ADD COLUMN IF NOT EXISTS title_en VARCHAR(100),
ADD COLUMN IF NOT EXISTS title_es VARCHAR(100),
ADD COLUMN IF NOT EXISTS title_de VARCHAR(100),
ADD COLUMN IF NOT EXISTS description_en TEXT,
ADD COLUMN IF NOT EXISTS description_es TEXT,
ADD COLUMN IF NOT EXISTS description_de TEXT,
ADD COLUMN IF NOT EXISTS points_required INTEGER DEFAULT 0;

-- Update existing badges with multilingual titles
UPDATE badges SET 
  title_en = CASE name
    WHEN 'First Confession' THEN 'First Step'
    WHEN 'Active User' THEN 'Truth Teller'
    WHEN 'Power User' THEN 'Calm Seeker'
    WHEN 'Deep Thinker' THEN 'Confession Master'
    ELSE name
  END,
  title_es = CASE name
    WHEN 'First Confession' THEN 'Primer Paso'
    WHEN 'Active User' THEN 'Narrador de Verdad'
    WHEN 'Power User' THEN 'Buscador de Calma'
    WHEN 'Deep Thinker' THEN 'Maestro de Confesiones'
    ELSE name
  END,
  title_de = CASE name
    WHEN 'First Confession' THEN 'Erster Schritt'
    WHEN 'Active User' THEN 'Wahrheitssager'
    WHEN 'Power User' THEN 'Ruhesuchender'
    WHEN 'Deep Thinker' THEN 'Beichtmeister'
    ELSE name
  END,
  description_en = description,
  description_es = description,
  description_de = description,
  points_required = CASE requirement_type
    WHEN 'streak_days' THEN requirement_value * 10
    WHEN 'confessions_count' THEN requirement_value * 2
    ELSE 5
  END
WHERE title_en IS NULL;