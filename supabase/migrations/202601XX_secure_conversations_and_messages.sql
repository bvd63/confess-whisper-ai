ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

ALTER TABLE conversations FORCE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants FORCE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN ('conversations','conversation_participants','messages')
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

CREATE POLICY "Conversations: participants only"
ON conversations
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM conversation_participants cp
        WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
    )
);

CREATE POLICY "Conversations: create"
ON conversations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Participants: self select"
ON conversation_participants
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Participants: owner insert"
ON conversation_participants
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = conversation_participants.conversation_id
        AND c.owner_id = auth.uid()
    )
);

CREATE POLICY "Messages: participants select"
ON messages
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM conversation_participants cp
        WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
);

CREATE POLICY "Messages: participants insert"
ON messages
FOR INSERT
WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
        SELECT 1 FROM conversation_participants cp
        WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
);