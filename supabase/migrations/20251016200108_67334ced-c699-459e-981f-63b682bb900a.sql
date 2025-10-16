-- Add columns for drafts and visibility
ALTER TABLE confessions
ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- Create confession_drafts table for auto-save
CREATE TABLE IF NOT EXISTS confession_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  mood TEXT,
  mood_intensity INTEGER,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE confession_drafts ENABLE ROW LEVEL SECURITY;

-- RLS policies for drafts
CREATE POLICY "Users can view their own drafts"
ON confession_drafts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own drafts"
ON confession_drafts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drafts"
ON confession_drafts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drafts"
ON confession_drafts FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_confession_drafts_updated_at
BEFORE UPDATE ON confession_drafts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create function for trending score calculation
CREATE OR REPLACE FUNCTION calculate_trending_score(
  likes INTEGER,
  comments INTEGER,
  shares INTEGER,
  views INTEGER,
  created_at TIMESTAMPTZ
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  age_hours NUMERIC;
  engagement_score NUMERIC;
  time_decay NUMERIC;
BEGIN
  -- Calculate age in hours
  age_hours := EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600.0;
  
  -- Calculate engagement score (weighted)
  engagement_score := (likes * 3) + (comments * 5) + (shares * 7) + (views * 0.1);
  
  -- Apply time decay (exponential decay, half-life of 24 hours)
  time_decay := POWER(0.5, age_hours / 24.0);
  
  -- Return final trending score
  RETURN engagement_score * time_decay;
END;
$$;

-- Create view for trending confessions
CREATE OR REPLACE VIEW trending_confessions AS
SELECT 
  c.*,
  calculate_trending_score(
    COALESCE(c.likes_count, 0),
    COALESCE(c.comments_count, 0),
    COALESCE(c.shared_count, 0),
    COALESCE(c.views_count, 0),
    c.created_at
  ) as trending_score
FROM confessions c
WHERE c.is_draft = false
  AND c.created_at > NOW() - INTERVAL '7 days'
ORDER BY trending_score DESC;