-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view their own participant records" ON conversation_participants;

-- Create a new policy that allows viewing all participants in conversations the user is part of
CREATE POLICY "Users can view participants in their conversations"
ON conversation_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
  )
);