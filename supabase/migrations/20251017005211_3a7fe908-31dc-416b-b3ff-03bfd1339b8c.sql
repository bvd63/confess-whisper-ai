-- Fix 1: Make confession_id nullable for follow notifications
ALTER TABLE notifications ALTER COLUMN confession_id DROP NOT NULL;

-- Fix 2: Update conversation_participants RLS to allow both users to join
DROP POLICY IF EXISTS "Users can create participant records" ON conversation_participants;

CREATE POLICY "Users can create participant records"
ON conversation_participants
FOR INSERT
WITH CHECK (
  -- Allow insert if the user is one of the participants
  auth.uid() = user_id 
  OR 
  -- Or if the user is creating a conversation with someone else (both participants)
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
  )
);