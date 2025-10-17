-- Create function to check if user is participant in conversation
CREATE OR REPLACE FUNCTION is_conversation_participant(conversation_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM conversation_participants
    WHERE conversation_id = conversation_uuid
      AND user_id = user_uuid
  )
$$;

-- Update policy to allow adding participants if current user is already a participant
DROP POLICY IF EXISTS "Users can create participant records" ON conversation_participants;

CREATE POLICY "Users can create participant records"
ON conversation_participants
FOR INSERT
WITH CHECK (
  -- User can add themselves
  auth.uid() = user_id 
  OR 
  -- Or user can add others if they are already a participant in this conversation
  is_conversation_participant(conversation_id, auth.uid())
);