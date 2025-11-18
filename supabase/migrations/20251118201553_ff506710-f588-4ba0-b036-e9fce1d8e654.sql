-- Ensure user_coins has REPLICA IDENTITY FULL for complete row data in realtime updates
ALTER TABLE user_coins REPLICA IDENTITY FULL;