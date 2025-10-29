-- Update all VIP flairs to cost 150 coins
UPDATE profile_flairs 
SET cost = 150
WHERE required_plan = 'vip';