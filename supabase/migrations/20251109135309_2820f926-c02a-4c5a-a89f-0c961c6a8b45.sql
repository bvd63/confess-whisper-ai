-- Create function to trigger push notifications via edge function
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_payload jsonb;
BEGIN
  -- Build payload for edge function
  notification_payload := jsonb_build_object(
    'userId', NEW.user_id::text,
    'type', NEW.type,
    'triggeredBy', NEW.triggered_by::text,
    'confessionId', NEW.confession_id::text,
    'commentContent', NEW.comment_content
  );

  -- Call edge function asynchronously via pg_net extension
  -- Note: This is a background task that won't block the insert
  PERFORM
    net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-secret', current_setting('app.settings.internal_job_secret', true)
      ),
      body := notification_payload
    );

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Failed to trigger push notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_notification_created ON public.notifications;

-- Create trigger to send push notifications when notifications are created
CREATE TRIGGER on_notification_created
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_push_notification();

-- Add column to profiles to store OneSignal player ID
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onesignal_player_id TEXT;