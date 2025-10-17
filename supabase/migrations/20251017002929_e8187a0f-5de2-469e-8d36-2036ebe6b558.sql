-- Add nickname_updated_at column to track when nickname was last changed
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS nickname_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing records to set initial timestamp
UPDATE public.profiles 
SET nickname_updated_at = NOW() 
WHERE nickname IS NOT NULL AND nickname_updated_at IS NULL;