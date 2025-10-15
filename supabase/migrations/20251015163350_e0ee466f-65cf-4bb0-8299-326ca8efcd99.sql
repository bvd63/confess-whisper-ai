-- Add category column to confessions table
ALTER TABLE public.confessions 
ADD COLUMN category text DEFAULT 'other' NOT NULL;

-- Add a check constraint for valid categories
ALTER TABLE public.confessions
ADD CONSTRAINT valid_category CHECK (category IN ('relationships', 'work', 'family', 'health', 'money', 'other'));

-- Create an index on category for better query performance
CREATE INDEX idx_confessions_category ON public.confessions(category);