-- Create a security definer function to check if a user owns a confession
CREATE OR REPLACE FUNCTION public.is_confession_owner(_user_id uuid, _confession_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.confessions
    WHERE id = _confession_id
      AND user_id = _user_id
  )
$$;

-- Update the comments delete policy to allow both comment authors and confession owners to delete
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;

CREATE POLICY "Users and confession owners can delete comments" 
ON public.comments 
FOR DELETE 
USING (
  auth.uid() = user_id OR public.is_confession_owner(auth.uid(), confession_id)
);