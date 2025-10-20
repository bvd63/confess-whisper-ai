-- Add reactions support to messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS client_message_id text;

-- Add unique constraint only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'messages_client_message_id_key'
  ) THEN
    ALTER TABLE public.messages ADD CONSTRAINT messages_client_message_id_key UNIQUE (client_message_id);
  END IF;
END$$;

-- Add soft-delete support for conversations (per user)
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS deleted_for jsonb DEFAULT '[]'::jsonb;

-- Add soft-delete support for notifications (per user)
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS deleted_for jsonb DEFAULT '[]'::jsonb;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_status ON public.messages(conversation_id, sender_id) WHERE seen_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON public.conversations(updated_at DESC);

-- Function to check if conversation is deleted for user
CREATE OR REPLACE FUNCTION is_conversation_deleted_for_user(conv_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id::text = ANY(
    SELECT jsonb_array_elements_text(deleted_for)
    FROM conversations
    WHERE id = conv_id
  );
$$;

-- Function to undelete conversation when new message arrives
CREATE OR REPLACE FUNCTION undelete_conversation_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove both participants from deleted_for array when new message arrives
  UPDATE conversations
  SET deleted_for = '[]'::jsonb,
      updated_at = NOW()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to undelete conversation on new message
DROP TRIGGER IF EXISTS trigger_undelete_conversation ON public.messages;
CREATE TRIGGER trigger_undelete_conversation
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION undelete_conversation_on_message();

-- Enable realtime for messages table (if not already enabled)
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Enable realtime for notifications table
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Add tables to realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL; -- Table already in publication
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL; -- Table already in publication
  END;
END$$;