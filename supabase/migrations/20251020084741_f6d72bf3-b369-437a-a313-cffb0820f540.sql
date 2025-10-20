-- Add read receipt and soft delete columns to messages
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS seen_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_for_sender BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_for_recipient BOOLEAN DEFAULT FALSE;

-- Update existing messages to have sent_at = created_at
UPDATE messages SET sent_at = created_at WHERE sent_at IS NULL;

-- Add soft delete to conversations
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS deleted_for_user_a BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_for_user_b BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS user_a_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS user_b_id UUID REFERENCES auth.users(id);

-- Create index for faster message queries
CREATE INDEX IF NOT EXISTS idx_messages_thread_time ON messages(conversation_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_soft_delete ON messages(conversation_id, deleted_for_sender, deleted_for_recipient);

-- Create function to get conversation partner
CREATE OR REPLACE FUNCTION get_conversation_partner(conv_id UUID, current_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  partner_id UUID;
BEGIN
  SELECT user_id INTO partner_id
  FROM conversation_participants
  WHERE conversation_id = conv_id
    AND user_id != current_user_id
  LIMIT 1;
  
  RETURN partner_id;
END;
$$;

-- Create function to mark messages as delivered
CREATE OR REPLACE FUNCTION mark_messages_delivered(thread_id UUID, user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE messages
  SET delivered_at = NOW()
  WHERE conversation_id = thread_id
    AND sender_id != user_id
    AND delivered_at IS NULL;
END;
$$;

-- Create function to mark messages as seen
CREATE OR REPLACE FUNCTION mark_messages_seen(thread_id UUID, message_ids UUID[], user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE messages
  SET seen_at = NOW()
  WHERE id = ANY(message_ids)
    AND conversation_id = thread_id
    AND sender_id != user_id
    AND seen_at IS NULL;
END;
$$;

-- Create function for soft delete
CREATE OR REPLACE FUNCTION soft_delete_conversation(conv_id UUID, user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_sender BOOLEAN;
BEGIN
  -- Check if user is sender for all their messages in this conversation
  UPDATE messages
  SET deleted_for_sender = TRUE
  WHERE conversation_id = conv_id
    AND sender_id = user_id;
  
  -- Mark as deleted for recipient for messages they received
  UPDATE messages
  SET deleted_for_recipient = TRUE
  WHERE conversation_id = conv_id
    AND sender_id != user_id;
END;
$$;