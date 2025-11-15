-- Drop all existing RLS policies on communities table
DROP POLICY IF EXISTS "Anyone can view public communities" ON communities;
DROP POLICY IF EXISTS "Members can view private communities" ON communities;
DROP POLICY IF EXISTS "Anyone can view communities" ON communities;
DROP POLICY IF EXISTS "Users can view all communities" ON communities;
DROP POLICY IF EXISTS "Authenticated users can create communities" ON communities;
DROP POLICY IF EXISTS "Admins can update their communities" ON communities;
DROP POLICY IF EXISTS "Admins can delete their communities" ON communities;

-- Create new RLS policies for communities table that avoid recursion
-- SELECT: Everyone can view public communities, members can view private communities they belong to
CREATE POLICY "select_communities_policy"
ON communities
FOR SELECT
TO authenticated, anon
USING (
  is_private = false 
  OR 
  (is_private = true AND public.is_community_member(auth.uid(), id))
);

-- INSERT: Authenticated users can create communities
CREATE POLICY "insert_communities_policy"
ON communities
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- UPDATE: Only community admins can update
CREATE POLICY "update_communities_policy"
ON communities
FOR UPDATE
TO authenticated
USING (public.get_community_member_role(auth.uid(), id) = 'admin')
WITH CHECK (public.get_community_member_role(auth.uid(), id) = 'admin');

-- DELETE: Only community admins can delete
CREATE POLICY "delete_communities_policy"
ON communities
FOR DELETE
TO authenticated
USING (public.get_community_member_role(auth.uid(), id) = 'admin');