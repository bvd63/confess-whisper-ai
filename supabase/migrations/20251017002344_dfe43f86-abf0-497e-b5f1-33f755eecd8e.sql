-- Add nickname field to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nickname TEXT;

-- Create unique index for nicknames to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS profiles_nickname_unique ON public.profiles(nickname) WHERE nickname IS NOT NULL;

-- Add check constraint for nickname format (alphanumeric, underscore, dot, 3-20 chars)
ALTER TABLE public.profiles ADD CONSTRAINT nickname_format CHECK (nickname ~* '^[a-z0-9_.]{3,20}$');