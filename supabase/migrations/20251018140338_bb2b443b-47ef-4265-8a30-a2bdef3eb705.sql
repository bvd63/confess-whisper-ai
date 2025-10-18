-- Fix infinite recursion in community_members RLS policies
-- Create security definer function to check community admin role
CREATE OR REPLACE FUNCTION public.is_community_admin(_user_id uuid, _community_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.community_members
    WHERE user_id = _user_id
      AND community_id = _community_id
      AND role IN ('admin', 'moderator')
  )
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Community admins can manage members" ON public.community_members;

-- Create new policies without recursion
CREATE POLICY "Community admins can update members"
ON public.community_members
FOR UPDATE
USING (public.is_community_admin(auth.uid(), community_id));

CREATE POLICY "Community admins can delete members"
ON public.community_members
FOR DELETE
USING (public.is_community_admin(auth.uid(), community_id));

CREATE POLICY "Community admins can insert members"
ON public.community_members
FOR INSERT
WITH CHECK (public.is_community_admin(auth.uid(), community_id));

-- Also fix the communities table policy
DROP POLICY IF EXISTS "Community admins can update" ON public.communities;

CREATE POLICY "Community admins can update"
ON public.communities
FOR UPDATE
USING (public.is_community_admin(auth.uid(), id));