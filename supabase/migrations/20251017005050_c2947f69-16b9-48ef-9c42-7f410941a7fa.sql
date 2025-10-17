-- Allow authenticated users to view other users' nicknames for search functionality
CREATE POLICY "Authenticated users can view nicknames"
ON profiles
FOR SELECT
USING (
  auth.role() = 'authenticated' 
  AND nickname IS NOT NULL
);