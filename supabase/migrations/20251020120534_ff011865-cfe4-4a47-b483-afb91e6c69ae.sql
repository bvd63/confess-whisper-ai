-- Add Premium trial tracking fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS trial_premium_used BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trial_premium_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_premium_ends_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster trial eligibility checks
CREATE INDEX IF NOT EXISTS idx_profiles_trial_premium_used ON profiles(trial_premium_used);

-- Add comment for documentation
COMMENT ON COLUMN profiles.trial_premium_used IS 'Set to true once user starts Premium trial - prevents multiple trials';
COMMENT ON COLUMN profiles.trial_premium_started_at IS 'Timestamp when Premium trial was activated';
COMMENT ON COLUMN profiles.trial_premium_ends_at IS 'Timestamp when Premium trial expires (3 days after start)';
