-- Enable realtime for user_follows table
ALTER TABLE public.user_follows REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_follows;