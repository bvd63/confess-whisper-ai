-- Add is_anonymous column to comments table
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS is_anonymous boolean DEFAULT true NOT NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_comments_is_anonymous ON public.comments(is_anonymous);

-- Add comment to document the column
COMMENT ON COLUMN public.comments.is_anonymous IS 'Whether the comment is posted anonymously (true) or publicly with username (false)';