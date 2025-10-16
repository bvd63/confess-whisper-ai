-- Comprehensive security hardening for maximum protection

-- 1. PROTECT USER_BADGES: Restrict to only show user's own badges
-- This prevents tracking user activity patterns and de-anonymization
DROP POLICY IF EXISTS "Anyone can view all user badges" ON public.user_badges;

CREATE POLICY "Users can only view their own badges"
ON public.user_badges
FOR SELECT
USING (auth.uid() = user_id);

-- Allow viewing badges of users you follow (for social features)
CREATE POLICY "Users can view badges of followed users"
ON public.user_badges
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_follows
    WHERE follower_id = auth.uid()
    AND following_id = user_badges.user_id
  )
);

-- 2. ADDITIONAL SECURITY: Add explicit deny for anonymous on ALL sensitive tables
CREATE POLICY "Deny anonymous access to bookmarks"
ON public.bookmarks
FOR SELECT
TO anon
USING (false);

CREATE POLICY "Deny anonymous access to user_likes"
ON public.user_likes
FOR SELECT
TO anon
USING (false);

CREATE POLICY "Deny anonymous access to user_follows"
ON public.user_follows
FOR SELECT
TO anon
USING (false);

CREATE POLICY "Deny anonymous access to notifications"
ON public.notifications
FOR SELECT
TO anon
USING (false);

CREATE POLICY "Deny anonymous access to user_streaks"
ON public.user_streaks
FOR SELECT
TO anon
USING (false);

CREATE POLICY "Deny anonymous access to user_coins"
ON public.user_coins
FOR SELECT
TO anon
USING (false);

CREATE POLICY "Deny anonymous access to coin_transactions"
ON public.coin_transactions
FOR SELECT
TO anon
USING (false);

CREATE POLICY "Deny anonymous access to mood_entries"
ON public.mood_entries
FOR SELECT
TO anon
USING (false);

CREATE POLICY "Deny anonymous access to user_preferences"
ON public.user_preferences
FOR SELECT
TO anon
USING (false);

CREATE POLICY "Deny anonymous access to confession_drafts"
ON public.confession_drafts
FOR SELECT
TO anon
USING (false);

CREATE POLICY "Deny anonymous access to referrals"
ON public.referrals
FOR SELECT
TO anon
USING (false);

CREATE POLICY "Deny anonymous access to user_blocks"
ON public.user_blocks
FOR SELECT
TO anon
USING (false);

CREATE POLICY "Deny anonymous access to confession_reports"
ON public.confession_reports
FOR SELECT
TO anon
USING (false);

CREATE POLICY "Deny anonymous access to moderation_logs"
ON public.moderation_logs
FOR SELECT
TO anon
USING (false);

CREATE POLICY "Deny anonymous access to analytics_events"
ON public.analytics_events
FOR SELECT
TO anon
USING (false);

CREATE POLICY "Deny anonymous access to confession_reactions"
ON public.confession_reactions
FOR SELECT
TO anon
USING (false);