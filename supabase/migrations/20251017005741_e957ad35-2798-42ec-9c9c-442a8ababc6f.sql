-- Allow users to see profiles of people they have conversations with
CREATE POLICY "Users can view profiles in their conversations"
ON profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp1
    JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
    WHERE cp1.user_id = auth.uid()
    AND cp2.user_id = profiles.user_id
  )
);

-- Create trigger to notify when a message is sent
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  recipient_id UUID;
BEGIN
  -- Get the other participant in the conversation
  SELECT user_id INTO recipient_id
  FROM conversation_participants
  WHERE conversation_id = NEW.conversation_id
    AND user_id != NEW.sender_id
  LIMIT 1;

  -- Create notification if recipient exists
  IF recipient_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, triggered_by, comment_content)
    VALUES (recipient_id, 'comment', NEW.sender_id, NEW.content);
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on messages table
DROP TRIGGER IF EXISTS on_message_sent ON messages;
CREATE TRIGGER on_message_sent
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION create_message_notification();