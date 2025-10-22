-- Enable realtime for profiles table to support real-time subscription updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;