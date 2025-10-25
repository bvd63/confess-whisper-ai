-- Fix flairs shop RLS policies and ensure proper service role access

-- Ensure service role can insert into user_flairs (needed for purchase-flair edge function)
DROP POLICY IF EXISTS "Service role can insert user flairs" ON public.user_flairs;
CREATE POLICY "Service role can insert user flairs"
ON public.user_flairs
FOR INSERT
TO service_role
WITH CHECK (true);

-- Ensure service role can update user_flairs (for equipping/unequipping)
DROP POLICY IF EXISTS "Service role can update user flairs" ON public.user_flairs;
CREATE POLICY "Service role can update user flairs"
ON public.user_flairs
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Add DELETE policy for service role to handle expired flairs
DROP POLICY IF EXISTS "Service role can delete user flairs" ON public.user_flairs;
CREATE POLICY "Service role can delete user flairs"
ON public.user_flairs
FOR DELETE
TO service_role
USING (true);

-- Ensure authenticated users can still update their own flairs
DROP POLICY IF EXISTS "Users can equip/unequip their flairs" ON public.user_flairs;
CREATE POLICY "Users can equip/unequip their flairs"
ON public.user_flairs
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);