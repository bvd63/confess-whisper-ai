-- Create a simpler policy for user search that allows authenticated users to find others
CREATE POLICY "Authenticated users can search for users by nickname"
ON profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND nickname IS NOT NULL
  AND (
    (is_nickname_public = true) OR 
    (nickname_visibility = 'PUBLIC'::nickname_visibility_enum)
  )
);