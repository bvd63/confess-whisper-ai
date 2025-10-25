-- Add onboarding fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS first_confession_claimed BOOLEAN DEFAULT false;

-- Create ai_reflections table for daily reflections feature
CREATE TABLE IF NOT EXISTS ai_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  tone_summary TEXT,
  reflection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  viewed_at TIMESTAMPTZ,
  UNIQUE(user_id, reflection_date)
);

-- Enable RLS on ai_reflections
ALTER TABLE ai_reflections ENABLE ROW LEVEL SECURITY;

-- Users can view their own reflections
CREATE POLICY "Users view own reflections"
ON ai_reflections FOR SELECT
USING (auth.uid() = user_id);

-- Service role can insert reflections
CREATE POLICY "Service role can insert reflections"
ON ai_reflections FOR INSERT
WITH CHECK (true);