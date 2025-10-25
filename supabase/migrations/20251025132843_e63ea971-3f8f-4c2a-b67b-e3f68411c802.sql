-- Fix flair required_plan to only use 'free' or 'vip' (no premium)
UPDATE profile_flairs 
SET required_plan = 'vip' 
WHERE required_plan = 'premium';

-- Add check constraint to ensure only free or vip
ALTER TABLE profile_flairs 
DROP CONSTRAINT IF EXISTS profile_flairs_required_plan_check;

ALTER TABLE profile_flairs 
ADD CONSTRAINT profile_flairs_required_plan_check 
CHECK (required_plan IN ('free', 'vip'));