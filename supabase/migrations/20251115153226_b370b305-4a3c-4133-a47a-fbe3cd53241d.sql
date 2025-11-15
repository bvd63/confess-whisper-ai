-- Add language field to communities
ALTER TABLE communities 
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en' CHECK (language IN ('en', 'es', 'de'));

-- Add status field to community_members for pending/active/banned states
ALTER TABLE community_members 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'banned'));

-- Update existing members to be active
UPDATE community_members SET status = 'active' WHERE status IS NULL;

-- Create index for faster queries on status
CREATE INDEX IF NOT EXISTS idx_community_members_status ON community_members(status);
CREATE INDEX IF NOT EXISTS idx_community_members_user_community ON community_members(user_id, community_id);

-- Update RLS policies for community_members to handle pending/banned states
DROP POLICY IF EXISTS "Users can view community members" ON community_members;
CREATE POLICY "Users can view active community members"
ON community_members FOR SELECT
USING (
  status = 'active' OR 
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = community_members.community_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('admin', 'moderator')
    AND cm.status = 'active'
  )
);

-- Allow users to join communities (insert pending for private, active for public)
DROP POLICY IF EXISTS "Users can join communities" ON community_members;
CREATE POLICY "Users can join communities"
ON community_members FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  (role = 'member' OR role = 'admin')
);

-- Allow users to leave communities
DROP POLICY IF EXISTS "Users can leave communities" ON community_members;
CREATE POLICY "Users can leave communities"
ON community_members FOR DELETE
USING (
  auth.uid() = user_id AND
  role != 'admin' -- Admins cannot leave their own community
);

-- Allow admins and moderators to update member status and roles
DROP POLICY IF EXISTS "Admins and moderators can manage members" ON community_members;
CREATE POLICY "Admins and moderators can manage members"
ON community_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = community_members.community_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('admin', 'moderator')
    AND cm.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM community_members cm
    WHERE cm.community_id = community_members.community_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('admin', 'moderator')
    AND cm.status = 'active'
  )
);

-- Update confessions RLS to respect community membership
DROP POLICY IF EXISTS "Users can view community confessions" ON confessions;
CREATE POLICY "Users can view community confessions"
ON confessions FOR SELECT
USING (
  community_id IS NULL OR
  EXISTS (
    SELECT 1 FROM communities c
    LEFT JOIN community_members cm ON c.id = cm.community_id AND cm.user_id = auth.uid()
    WHERE c.id = confessions.community_id
    AND (
      c.is_private = false OR
      (cm.status = 'active')
    )
  )
);

-- Allow active community members to post
DROP POLICY IF EXISTS "Community members can create confessions" ON confessions;
CREATE POLICY "Community members can create confessions"
ON confessions FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  (
    community_id IS NULL OR
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = confessions.community_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
    )
  )
);

-- Allow admins and moderators to delete community posts
DROP POLICY IF EXISTS "Admins and moderators can delete community posts" ON confessions;
CREATE POLICY "Admins and moderators can delete community posts"
ON confessions FOR DELETE
USING (
  auth.uid() = user_id OR
  (
    community_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = confessions.community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
      AND cm.status = 'active'
    )
  )
);