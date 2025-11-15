-- Remove duplicate policy on communities table
DROP POLICY IF EXISTS "Community admins can update" ON communities;

-- The correct policy "update_communities_policy" already exists and is sufficient