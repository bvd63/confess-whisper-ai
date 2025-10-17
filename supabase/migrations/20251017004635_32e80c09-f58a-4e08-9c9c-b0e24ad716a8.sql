-- Fix infinite recursion in conversation_participants RLS policies
-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can join conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update their own participant record" ON conversation_participants;

-- Create corrected policies without recursion
CREATE POLICY "Users can view their own participant records"
ON conversation_participants
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create participant records"
ON conversation_participants
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participant records"
ON conversation_participants
FOR UPDATE
USING (auth.uid() = user_id);

-- Fix conversations policies to avoid recursion
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;

CREATE POLICY "Users can view all conversations"
ON conversations
FOR SELECT
USING (true);

CREATE POLICY "Anyone can create conversations"
ON conversations
FOR INSERT
WITH CHECK (true);

-- Fix messages policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;

CREATE POLICY "Users can view all messages"
ON messages
FOR SELECT
USING (true);

CREATE POLICY "Users can send messages"
ON messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);