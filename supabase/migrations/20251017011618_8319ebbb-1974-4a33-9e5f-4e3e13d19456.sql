-- Create function to delete a conversation and all its related data
CREATE OR REPLACE FUNCTION delete_conversation(_conversation_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if user is a participant in this conversation
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = _conversation_id
    AND user_id = _user_id
  ) THEN
    RETURN FALSE;
  END IF;

  -- Delete all messages in the conversation
  DELETE FROM messages
  WHERE conversation_id = _conversation_id;

  -- Delete all participants
  DELETE FROM conversation_participants
  WHERE conversation_id = _conversation_id;

  -- Delete the conversation
  DELETE FROM conversations
  WHERE id = _conversation_id;

  RETURN TRUE;
END;
$$;