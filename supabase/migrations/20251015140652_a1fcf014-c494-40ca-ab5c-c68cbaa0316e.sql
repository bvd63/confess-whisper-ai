-- Add likes column to confessions for popularity tracking
ALTER TABLE public.confessions ADD COLUMN likes_count INTEGER DEFAULT 0;

-- Add sharing/viewing stats
ALTER TABLE public.confessions ADD COLUMN views_count INTEGER DEFAULT 0;
ALTER TABLE public.confessions ADD COLUMN shared_count INTEGER DEFAULT 0;

-- Enable realtime for confessions table
ALTER TABLE public.confessions REPLICA IDENTITY FULL;

-- Add confessions to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.confessions;