-- Phase 3: GDPR Compliance & User Consents

-- Create user_consents table for GDPR compliance
CREATE TABLE IF NOT EXISTS user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  consent_type TEXT NOT NULL, -- 'terms_of_service', 'privacy_policy', 'data_processing'
  version TEXT NOT NULL,
  consented_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user_type 
ON user_consents (user_id, consent_type);

ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own consents"
ON user_consents FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own consents"
ON user_consents FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add function to check if user has given required consents
CREATE OR REPLACE FUNCTION has_valid_consent(_user_id uuid, _consent_type text, _min_version text DEFAULT '1.0')
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_consents
    WHERE user_id = _user_id
      AND consent_type = _consent_type
      AND version >= _min_version
    ORDER BY consented_at DESC
    LIMIT 1
  )
$$;