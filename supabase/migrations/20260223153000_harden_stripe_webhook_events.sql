-- Harden stripe webhook idempotency store

ALTER TABLE public.stripe_webhook_events
  ADD COLUMN IF NOT EXISTS stripe_event_id TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stripe_webhook_events'
      AND column_name = 'event_id'
  ) THEN
    UPDATE public.stripe_webhook_events
    SET stripe_event_id = event_id
    WHERE stripe_event_id IS NULL
      AND event_id IS NOT NULL;
  END IF;
END $$;

UPDATE public.stripe_webhook_events
SET stripe_event_id = 'legacy-' || md5(clock_timestamp()::text || ctid::text)
WHERE stripe_event_id IS NULL;

ALTER TABLE public.stripe_webhook_events
  ALTER COLUMN stripe_event_id SET NOT NULL;

ALTER TABLE public.stripe_webhook_events
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stripe_webhook_events'
      AND column_name = 'received_at'
  ) THEN
    UPDATE public.stripe_webhook_events
    SET created_at = received_at
    WHERE created_at IS NULL
      AND received_at IS NOT NULL;
  END IF;
END $$;

ALTER TABLE public.stripe_webhook_events
  ALTER COLUMN created_at SET DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'stripe_webhook_events_stripe_event_id_key'
      AND conrelid = 'public.stripe_webhook_events'::regclass
  ) THEN
    ALTER TABLE public.stripe_webhook_events
      ADD CONSTRAINT stripe_webhook_events_stripe_event_id_key UNIQUE (stripe_event_id);
  END IF;
END $$;

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events FORCE ROW LEVEL SECURITY;

DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'stripe_webhook_events'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.stripe_webhook_events', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "Service role can manage stripe_webhook_events"
  ON public.stripe_webhook_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

REVOKE ALL ON TABLE public.stripe_webhook_events FROM PUBLIC;
REVOKE ALL ON TABLE public.stripe_webhook_events FROM anon;
REVOKE ALL ON TABLE public.stripe_webhook_events FROM authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE public.stripe_webhook_events TO service_role;
  END IF;
END $$;
