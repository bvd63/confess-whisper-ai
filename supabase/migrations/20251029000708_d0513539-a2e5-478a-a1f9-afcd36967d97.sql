-- Move magic, rocket, and trophy flairs from VIP to FREE tier
UPDATE profile_flairs 
SET required_plan = 'free'
WHERE name_key IN ('flair_magic', 'flair_rocket', 'flair_trophy');