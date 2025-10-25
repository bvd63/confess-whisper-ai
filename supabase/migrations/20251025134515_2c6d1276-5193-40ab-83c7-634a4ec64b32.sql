-- Final onboarding and cleanup migration

-- 1. Add onboarding fields if not exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS first_confession_claimed BOOLEAN DEFAULT false;

-- 2. Ensure only free and vip tiers
UPDATE profiles 
SET subscription_tier = 'free' 
WHERE subscription_tier NOT IN ('free', 'vip') OR subscription_tier IS NULL;

-- 3. Add index for faster onboarding checks
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding 
ON profiles(user_id, onboarding_completed);

-- 4. Create notification settings if not exists
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  daily_reminder BOOLEAN DEFAULT true,
  reminder_time TIME DEFAULT '20:00:00',
  evening_reflection BOOLEAN DEFAULT false,
  streak_alerts BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Ensure RLS is enabled
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing policy if exists and create new one
DROP POLICY IF EXISTS "Users manage own notification settings" ON notification_settings;

CREATE POLICY "Users manage own notification settings"
ON notification_settings FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);