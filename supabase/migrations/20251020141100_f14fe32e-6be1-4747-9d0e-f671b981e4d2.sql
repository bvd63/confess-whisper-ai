-- Fix auth_sessions table schema to match edge function expectations
ALTER TABLE public.auth_sessions 
  RENAME COLUMN refresh_token_hash TO token_hash;

ALTER TABLE public.auth_sessions
  ADD COLUMN IF NOT EXISTS stay_connected BOOLEAN DEFAULT false;

-- Add missing column to failed_login_attempts
ALTER TABLE public.failed_login_attempts
  ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- Add missing column to captcha_requirements  
ALTER TABLE public.captcha_requirements
  ADD COLUMN IF NOT EXISTS reason TEXT;