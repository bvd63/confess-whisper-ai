-- Add last_daily_reward column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_daily_reward TIMESTAMP WITH TIME ZONE;