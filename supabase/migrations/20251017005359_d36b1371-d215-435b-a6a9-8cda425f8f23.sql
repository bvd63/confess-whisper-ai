-- Simplify conversation_participants policy to just allow users to add themselves
DROP POLICY IF EXISTS "Users can create participant records" ON conversation_participants;

CREATE POLICY "Users can create participant records"
ON conversation_participants
FOR INSERT
WITH CHECK (auth.uid() = user_id);