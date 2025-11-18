-- Enable realtime for profiles table to ensure instant subscription updates
ALTER TABLE profiles REPLICA IDENTITY FULL;