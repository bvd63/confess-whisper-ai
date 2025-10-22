-- Create subscription_conflict_logs table for tracking conflict resolution
CREATE TABLE IF NOT EXISTS public.subscription_conflict_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('KEEP_NEW', 'KEEP_OLD')),
  kept_subscription_id TEXT NOT NULL,
  canceled_subscription_id TEXT NOT NULL,
  existing_status TEXT,
  new_status TEXT,
  resolution_reason TEXT,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_conflict_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own conflict logs
CREATE POLICY "Users can view their own conflict logs"
ON public.subscription_conflict_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Service role has full access
CREATE POLICY "Service role full access to conflict logs"
ON public.subscription_conflict_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_subscription_conflict_logs_user_id ON public.subscription_conflict_logs(user_id);
CREATE INDEX idx_subscription_conflict_logs_created_at ON public.subscription_conflict_logs(created_at DESC);