-- Add trial fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trial_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE;

-- Create index for trial expiry checks
CREATE INDEX IF NOT EXISTS idx_profiles_trial_end_date 
ON public.profiles(trial_end_date) 
WHERE trial_active = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.trial_active IS 'Whether user is currently on Premium trial';
COMMENT ON COLUMN public.profiles.trial_end_date IS 'When the Premium trial expires';