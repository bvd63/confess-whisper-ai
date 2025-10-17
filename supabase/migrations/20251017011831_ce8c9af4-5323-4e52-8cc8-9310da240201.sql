-- Add password_changed_at column to profiles table to track password changes
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_password_changed_at ON profiles(password_changed_at);