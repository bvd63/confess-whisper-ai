-- M1: Stripe subscription webhook hardening
-- 1) Idempotency table for Stripe webhook events
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Ensure profiles has stripe_customer_id for direct customer mapping
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Index for fast lookups by Stripe customer id
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
ON public.profiles (stripe_customer_id);

-- Add unique index if current data is clean (no duplicate non-null customer ids)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_profiles_stripe_customer_id_unique'
  )
  AND NOT EXISTS (
    SELECT stripe_customer_id
    FROM public.profiles
    WHERE stripe_customer_id IS NOT NULL
    GROUP BY stripe_customer_id
    HAVING COUNT(*) > 1
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX idx_profiles_stripe_customer_id_unique ON public.profiles (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL';
  END IF;
END $$;
