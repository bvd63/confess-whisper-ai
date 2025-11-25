-- Add highlight columns to comments table for Highlight Comment feature
ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS is_highlighted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS highlight_expires_at TIMESTAMPTZ;

-- Create index for efficient querying of highlighted comments
CREATE INDEX IF NOT EXISTS idx_comments_highlighted ON comments(is_highlighted, highlight_expires_at) 
WHERE is_highlighted = TRUE;