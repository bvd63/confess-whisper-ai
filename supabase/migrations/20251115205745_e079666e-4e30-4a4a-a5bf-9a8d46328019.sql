-- Fix infinite recursion in community_members RLS policies
-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can view community members" ON community_members;
DROP POLICY IF EXISTS "Users can view active community members" ON community_members;
DROP POLICY IF EXISTS "Users can join communities" ON community_members;
DROP POLICY IF EXISTS "Users can leave communities" ON community_members;
DROP POLICY IF EXISTS "Community admins can insert members" ON community_members;
DROP POLICY IF EXISTS "Community admins can update members" ON community_members;
DROP POLICY IF EXISTS "Community admins can delete members" ON community_members;
DROP POLICY IF EXISTS "Admins and moderators can manage members" ON community_members;

-- Create helper function to check if user is member of community
-- This function is SECURITY DEFINER so it bypasses RLS
CREATE OR REPLACE FUNCTION public.is_community_member(_user_id uuid, _community_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM community_members
    WHERE user_id = _user_id
      AND community_id = _community_id
      AND status = 'active'
  )
$$;

-- Create helper function to check member role
CREATE OR REPLACE FUNCTION public.get_community_member_role(_user_id uuid, _community_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM community_members
  WHERE user_id = _user_id
    AND community_id = _community_id
    AND status = 'active'
  LIMIT 1
$$;

-- NEW RLS POLICIES WITHOUT RECURSION

-- 1. SELECT: Users can view members based on their role
CREATE POLICY "Users can view community members"
ON community_members
FOR SELECT
USING (
  -- Own membership record
  auth.uid() = user_id
  OR
  -- Active members in public communities
  (
    status = 'active' 
    AND EXISTS (
      SELECT 1 FROM communities c 
      WHERE c.id = community_members.community_id 
      AND c.is_private = false
    )
  )
  OR
  -- All members if user is active member of the community
  is_community_member(auth.uid(), community_id)
  OR
  -- All members if user is admin/moderator
  is_community_admin(auth.uid(), community_id)
);

-- 2. INSERT: Users can join communities
CREATE POLICY "Users can join communities"
ON community_members
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (role = 'member' OR role = 'admin')
);

-- 3. DELETE: Users can leave, admins can remove members
CREATE POLICY "Users can leave or admins can remove"
ON community_members
FOR DELETE
USING (
  -- Users can leave (but not if they're the only admin)
  (auth.uid() = user_id AND role != 'admin')
  OR
  -- Admins can remove others
  is_community_admin(auth.uid(), community_id)
);

-- 4. UPDATE: Admins and moderators can update member status/role
CREATE POLICY "Admins can manage member roles"
ON community_members
FOR UPDATE
USING (
  is_community_admin(auth.uid(), community_id)
)
WITH CHECK (
  is_community_admin(auth.uid(), community_id)
);

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION public.is_community_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_community_member_role(uuid, uuid) TO authenticated;