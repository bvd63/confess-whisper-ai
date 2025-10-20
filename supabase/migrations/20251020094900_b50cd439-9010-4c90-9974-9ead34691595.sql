-- Allow anyone (including anonymous users) to view public nicknames
CREATE POLICY "Anyone can view public nicknames"
ON public.profiles
FOR SELECT
TO public
USING (
  nickname IS NOT NULL 
  AND (is_nickname_public = true OR nickname_visibility = 'PUBLIC')
);

-- Drop the old restrictive policy that only allowed authenticated users
DROP POLICY IF EXISTS "Authenticated users can view all nicknames" ON public.profiles;