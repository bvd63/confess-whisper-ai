-- Update Popular package: 150 -> 125 coins
UPDATE coin_packages
SET coins = 125
WHERE name = 'Popular';

-- Update Value package: 350 -> 300 coins
UPDATE coin_packages
SET coins = 300
WHERE name = 'Value';