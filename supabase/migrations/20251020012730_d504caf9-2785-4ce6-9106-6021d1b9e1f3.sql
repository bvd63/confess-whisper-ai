-- Add nickname_visibility to profiles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'nickname_visibility_enum'
  ) THEN
    CREATE TYPE nickname_visibility_enum AS ENUM ('PUBLIC', 'ANON_ON_POSTS');
  END IF;
END $$;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS nickname_visibility nickname_visibility_enum DEFAULT 'PUBLIC';

-- Add snapshot fields to confessions
ALTER TABLE confessions
ADD COLUMN IF NOT EXISTS author_nickname_snapshot text,
ADD COLUMN IF NOT EXISTS author_visibility_snapshot text;

-- Migrate existing confession_boosts table
ALTER TABLE confession_boosts
ADD COLUMN IF NOT EXISTS coins_spent integer DEFAULT 15,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS starts_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS ends_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Update ends_at from boost_until if not already set
UPDATE confession_boosts
SET ends_at = boost_until
WHERE ends_at IS NULL AND boost_until IS NOT NULL;

-- Update status based on boost_until
UPDATE confession_boosts
SET status = CASE 
  WHEN boost_until > NOW() THEN 'ACTIVE'
  ELSE 'EXPIRED'
END
WHERE status = 'ACTIVE' OR status IS NULL;

-- Make status NOT NULL now that values are set
ALTER TABLE confession_boosts
ALTER COLUMN status SET NOT NULL,
ALTER COLUMN ends_at SET NOT NULL;

-- Add constraint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_status'
  ) THEN
    ALTER TABLE confession_boosts
    ADD CONSTRAINT valid_status CHECK (status IN ('ACTIVE', 'EXPIRED', 'CANCELED'));
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_confession_boosts_confession_status 
ON confession_boosts(confession_id, status);

CREATE INDEX IF NOT EXISTS idx_confession_boosts_ends_at 
ON confession_boosts(ends_at);

-- Update RLS policies - drop existing if needed
DROP POLICY IF EXISTS "Anyone can view active boosts" ON confession_boosts;
DROP POLICY IF EXISTS "Users can create boosts for their confessions" ON confession_boosts;

CREATE POLICY "Anyone can view active boosts"
ON confession_boosts FOR SELECT
USING (status = 'ACTIVE');

CREATE POLICY "Users can create boosts for their confessions"
ON confession_boosts FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM confessions 
    WHERE confessions.id = confession_id 
    AND confessions.user_id = auth.uid()
  )
);

-- Create confession_insights table
CREATE TABLE IF NOT EXISTS confession_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  confession_id uuid NOT NULL REFERENCES confessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  insight_text text NOT NULL,
  extra_prompt text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Index for insight lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_confession_insights_confession 
ON confession_insights(confession_id);

-- Enable RLS on confession_insights
ALTER TABLE confession_insights ENABLE ROW LEVEL SECURITY;

-- RLS policies for confession_insights
DROP POLICY IF EXISTS "Users can view insights for their confessions" ON confession_insights;
DROP POLICY IF EXISTS "Users can create insights for their confessions" ON confession_insights;
DROP POLICY IF EXISTS "Users can update their confession insights" ON confession_insights;
DROP POLICY IF EXISTS "Users can delete their confession insights" ON confession_insights;

CREATE POLICY "Users can view insights for their confessions"
ON confession_insights FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM confessions WHERE confessions.id = confession_id AND confessions.user_id = auth.uid())
);

CREATE POLICY "Users can create insights for their confessions"
ON confession_insights FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM confessions WHERE confessions.id = confession_id AND confessions.user_id = auth.uid())
);

CREATE POLICY "Users can update their confession insights"
ON confession_insights FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their confession insights"
ON confession_insights FOR DELETE
USING (auth.uid() = user_id);

-- Function to expire boosts
CREATE OR REPLACE FUNCTION expire_active_boosts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE confession_boosts
  SET status = 'EXPIRED'
  WHERE status = 'ACTIVE' AND ends_at <= NOW();
END;
$$;