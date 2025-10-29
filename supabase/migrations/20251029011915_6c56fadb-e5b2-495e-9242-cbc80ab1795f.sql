-- Remove evening_reflection column from notification_settings table
ALTER TABLE public.notification_settings 
DROP COLUMN IF EXISTS evening_reflection;