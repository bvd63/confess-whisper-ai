-- Add anonymity control columns to confessions table
ALTER TABLE public.confessions 
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS author_display_name_snapshot TEXT NULL;

-- Backfill existing rows with default anonymous behavior
UPDATE public.confessions 
SET is_anonymous = TRUE, 
    author_display_name_snapshot = NULL 
WHERE is_anonymous IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_confessions_is_anonymous ON public.confessions(is_anonymous);

-- Add comment for documentation
COMMENT ON COLUMN public.confessions.is_anonymous IS 'Whether the confession was posted anonymously';
COMMENT ON COLUMN public.confessions.author_display_name_snapshot IS 'Snapshot of author display name at post time (NULL when anonymous)';