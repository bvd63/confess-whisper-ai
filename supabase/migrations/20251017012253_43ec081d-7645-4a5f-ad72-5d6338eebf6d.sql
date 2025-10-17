-- Drop the restrictive policy and create a more permissive one for viewing nicknames
DROP POLICY IF EXISTS "Authenticated users can view nicknames" ON profiles;

-- Allow all authenticated users to view basic profile info (nickname) of any user
CREATE POLICY "Authenticated users can view all nicknames"
ON profiles
FOR SELECT
TO authenticated
USING (nickname IS NOT NULL);

-- Also ensure authenticated users can view profiles they interact with
CREATE POLICY "Authenticated users can view profiles in notifications"
ON profiles
FOR SELECT  
TO authenticated
USING (
  user_id IN (
    SELECT triggered_by FROM notifications WHERE user_id = auth.uid()
  )
  OR
  user_id IN (
    SELECT user_id FROM notifications WHERE triggered_by = auth.uid()
  )
);