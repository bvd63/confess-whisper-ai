-- Add explicit deny policies for anonymous access to sensitive tables

-- Deny anonymous access to profiles table (contains Stripe customer data)
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- Deny anonymous access to payment_history table (contains transaction data)
CREATE POLICY "Deny anonymous access to payment_history"
ON public.payment_history
FOR SELECT
TO anon
USING (false);