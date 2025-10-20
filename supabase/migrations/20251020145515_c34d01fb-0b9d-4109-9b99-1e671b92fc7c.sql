-- Fix infinite recursion in RLS policy for conversation_participants SELECT
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;

CREATE POLICY "Users can view participants in their conversations"
ON public.conversation_participants
FOR SELECT
USING (
  public.is_conversation_participant(conversation_participants.conversation_id, auth.uid())
);
