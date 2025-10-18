-- Fix critical security issues: Restrict messages and conversations to participants only

-- 1. Fix messages table - currently allows anyone to view all messages
DROP POLICY IF EXISTS "Users can view all messages" ON messages;

CREATE POLICY "Users can view messages in their conversations"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = messages.conversation_id
    AND user_id = auth.uid()
  )
);

-- 2. Fix conversations table - currently allows anyone to view all conversations
DROP POLICY IF EXISTS "Users can view all conversations" ON conversations;

CREATE POLICY "Users can view their conversations"
ON conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conversations.id
    AND user_id = auth.uid()
  )
);

-- Add comment for documentation
COMMENT ON POLICY "Users can view messages in their conversations" ON messages IS 
'Security fix: Users can only view messages in conversations where they are participants';