-- Safe additive migration: add parent_comment_id to comments table for reply support
-- This is non-destructive: nullable column with no default, existing rows unaffected.

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS parent_comment_id UUID NULL
    REFERENCES public.comments(id) ON DELETE CASCADE;

-- Index for efficient reply lookup by parent
CREATE INDEX IF NOT EXISTS idx_comments_parent_comment_id
  ON public.comments(parent_comment_id);
