-- Migration: Add comment threading support (parent_comment_id)
-- Matches the exact column name used by the frontend reply insert in CommentThread.tsx

-- Step 1: Add the parent_comment_id column (nullable, so all existing rows get NULL safely)
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS parent_comment_id uuid NULL;

-- Step 2: Add self-referencing FK with NOT VALID first (safe on production with existing data)
-- ON DELETE CASCADE: if a parent comment is deleted, replies are also removed.
-- This prevents orphaned replies with no visible context. RESTRICT would block
-- users from deleting their own comments that have been replied to — unacceptable UX.
-- Wrapped in DO block to be idempotent (no IF NOT EXISTS for ADD CONSTRAINT in PG).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'comments_parent_comment_id_fkey'
       AND conrelid = 'public.comments'::regclass
  ) THEN
    ALTER TABLE public.comments
      ADD CONSTRAINT comments_parent_comment_id_fkey
      FOREIGN KEY (parent_comment_id)
      REFERENCES public.comments(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END;
$$;

-- Validate the constraint (instant when all existing values are NULL)
ALTER TABLE public.comments
  VALIDATE CONSTRAINT comments_parent_comment_id_fkey;

-- Step 3: Index for efficient thread queries (fetch all replies for a parent)
CREATE INDEX IF NOT EXISTS idx_comments_parent_comment_id
  ON public.comments(parent_comment_id);

-- Step 4: Partial index for fast top-level comment fetching per confession
-- Used by feed/detail views that show only root-level comments
CREATE INDEX IF NOT EXISTS idx_comments_confession_top_level
  ON public.comments(confession_id)
  WHERE parent_comment_id IS NULL;

-- Step 5: Guard against cross-confession reply links.
-- A reply's parent_comment_id must point to a comment on the SAME confession.
-- A plain CHECK constraint cannot do this (it cannot read other rows), so we use
-- a SECURITY DEFINER trigger that is narrow in scope and read-only on comments.

CREATE OR REPLACE FUNCTION public.validate_reply_same_confession()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_confession_id uuid;
BEGIN
  -- Only validate when parent_comment_id is provided
  IF NEW.parent_comment_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Read the parent comment's confession_id
  SELECT confession_id
    INTO v_parent_confession_id
    FROM public.comments
   WHERE id = NEW.parent_comment_id;

  -- Reject if parent does not exist or belongs to a different confession
  IF v_parent_confession_id IS NULL THEN
    RAISE EXCEPTION 'parent_comment_id % does not exist', NEW.parent_comment_id;
  END IF;

  IF v_parent_confession_id <> NEW.confession_id THEN
    RAISE EXCEPTION 'reply confession_id does not match parent comment confession_id';
  END IF;

  RETURN NEW;
END;
$$;

-- Attach the guard trigger (BEFORE INSERT so invalid rows never touch the table)
DROP TRIGGER IF EXISTS trg_validate_reply_same_confession ON public.comments;
CREATE TRIGGER trg_validate_reply_same_confession
  BEFORE INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_reply_same_confession();

-- RLS NOTE:
-- Existing policies already cover replies correctly:
--   SELECT: "Anyone can view comments" -> USING (true)  -- replies are readable
--   INSERT: "Authenticated users can create comments" -> WITH CHECK (auth.uid() = user_id)
--           This allows inserting with any parent_comment_id value; the trigger
--           above enforces cross-confession safety without widening auth.
-- No RLS policy changes required.
