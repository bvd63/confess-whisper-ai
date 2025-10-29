-- Update heart flair icon to actual heart emoji
UPDATE profile_flairs 
SET icon = '❤️'
WHERE name_key = 'flair_heart';