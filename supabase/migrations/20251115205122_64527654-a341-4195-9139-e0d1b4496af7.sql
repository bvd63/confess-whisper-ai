-- Enable realtime for communities and community_members tables
ALTER PUBLICATION supabase_realtime ADD TABLE communities;
ALTER PUBLICATION supabase_realtime ADD TABLE community_members;

-- Set replica identity to full for complete row data in realtime
ALTER TABLE communities REPLICA IDENTITY FULL;
ALTER TABLE community_members REPLICA IDENTITY FULL;