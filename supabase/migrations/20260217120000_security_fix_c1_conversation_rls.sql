-- Security Fix C1: Harden conversation participant/message inserts

-- Ensure conversations have an explicit owner used by RLS checks
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Backfill owner_id for existing conversations using earliest participant row
WITH ranked_participants AS (
  SELECT
    cp.conversation_id,
    cp.user_id,
    ROW_NUMBER() OVER (
      PARTITION BY cp.conversation_id
      ORDER BY cp.joined_at ASC NULLS LAST, cp.user_id ASC
    ) AS row_num
  FROM public.conversation_participants cp
)
UPDATE public.conversations c
SET owner_id = rp.user_id
FROM ranked_participants rp
WHERE c.id = rp.conversation_id
  AND rp.row_num = 1
  AND c.owner_id IS NULL;

-- Explicit invitation table for controlled participant onboarding
CREATE TABLE IF NOT EXISTS public.conversation_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  invited_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (conversation_id, invited_user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_invitations_conversation
ON public.conversation_invitations(conversation_id);

CREATE INDEX IF NOT EXISTS idx_conversation_invitations_invited_user
ON public.conversation_invitations(invited_user_id);

ALTER TABLE public.conversation_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their conversation invitations" ON public.conversation_invitations;
DROP POLICY IF EXISTS "Conversation owners can create invitations" ON public.conversation_invitations;

CREATE POLICY "Users can view their conversation invitations"
ON public.conversation_invitations
FOR SELECT
TO authenticated
USING (auth.uid() = invited_user_id OR auth.uid() = invited_by_user_id);

CREATE POLICY "Conversation owners can create invitations"
ON public.conversation_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = invited_by_user_id
  AND EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = conversation_invitations.conversation_id
      AND c.owner_id = auth.uid()
  )
);

-- Remove permissive participant insert policies
DROP POLICY IF EXISTS "Users can join conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can create participant records" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can insert participants with ownership or invitation" ON public.conversation_participants;

-- Allow participant INSERT only for owner self-join or explicit accepted invitation
CREATE POLICY "Users can insert participants with ownership or invitation"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = conversation_participants.conversation_id
        AND c.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.conversation_invitations ci
      WHERE ci.conversation_id = conversation_participants.conversation_id
        AND ci.invited_user_id = auth.uid()
        AND ci.status = 'accepted'
    )
  )
);

-- Remove broad messages INSERT policies and enforce participant-only sends
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;

CREATE POLICY "Users can send messages to their conversations"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
  )
);
