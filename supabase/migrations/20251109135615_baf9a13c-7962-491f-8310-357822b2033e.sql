-- Add notification preference columns to notification_settings table
ALTER TABLE public.notification_settings
ADD COLUMN IF NOT EXISTS notify_likes boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_comments boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_follows boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_messages boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_notification_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_notification_settings_timestamp ON public.notification_settings;

CREATE TRIGGER update_notification_settings_timestamp
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_notification_settings_updated_at();