-- Add subscription tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN stripe_customer_id text,
ADD COLUMN stripe_subscription_id text,
ADD COLUMN subscription_status text DEFAULT 'free' CHECK (subscription_status IN ('free', 'active', 'canceled', 'past_due'));

-- Create payment history table
CREATE TABLE public.payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_id text NOT NULL,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'ron',
  status text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment history"
ON public.payment_history
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);