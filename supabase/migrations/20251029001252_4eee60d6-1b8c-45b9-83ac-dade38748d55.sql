-- Update magic, rocket, and trophy flairs to cost 80 coins
UPDATE profile_flairs 
SET cost = 80
WHERE name_key IN ('flair_magic', 'flair_rocket', 'flair_trophy');