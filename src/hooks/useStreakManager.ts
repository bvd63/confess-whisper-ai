import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from './useCurrentUser';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastConfessionDate: string | null;
  totalPoints: number;
  level: number;
  isVIP: boolean;
}

interface StreakStatus {
  current_streak: number;
  longest_streak: number;
  last_confession_date: string | null;
  total_points: number;
  level: number;
  subscription_status: string | null;
  shouldReset: boolean;
  isFirstToday: boolean;
}

export const useStreakManager = () => {
  const { user } = useCurrentUser();
  const { t } = useLanguage();
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  // Load streak data
  const loadStreakData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get streak info
      const { data: streakInfo } = await supabase
        .from('user_streaks')
        .select('current_streak, longest_streak, last_confession_date')
        .eq('user_id', user.id)
        .single();

      // Get profile info for points/level/subscription
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_points, level, subscription_status')
        .eq('user_id', user.id)
        .single();

      if (streakInfo && profile) {
        setStreakData({
          currentStreak: streakInfo.current_streak || 0,
          longestStreak: streakInfo.longest_streak || 0,
          lastConfessionDate: streakInfo.last_confession_date,
          totalPoints: profile.total_points || 0,
          level: profile.level || 1,
          isVIP: profile.subscription_status === 'active'
        });
        
        // Check for streak bonus milestones (3, 5, 7 days)
        const currentStreak = streakInfo.current_streak || 0;
        if ([3, 5, 7].includes(currentStreak)) {
          // Award streak bonus in background
          try {
            await supabase.functions.invoke('award-streak-bonus', {
              body: { currentStreak }
            });
          } catch (err) {
            console.error('Error awarding streak bonus:', err);
          }
        }
      }
    } catch (error) {
      console.error('Error loading streak data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadStreakData();
  }, [loadStreakData]);

  // Check streak status
  const checkStreak = useCallback(async (): Promise<StreakStatus | null> => {
    if (!user) return null;

    try {
      // Get combined data
      const { data: streakInfo } = await supabase
        .from('user_streaks')
        .select('current_streak, longest_streak, last_confession_date')
        .eq('user_id', user.id)
        .single();

      const { data: profile } = await supabase
        .from('profiles')
        .select('total_points, level, subscription_status')
        .eq('user_id', user.id)
        .single();

      if (!streakInfo || !profile) return null;

      const today = new Date().toISOString().split('T')[0];
      const lastDate = streakInfo.last_confession_date;
      
      // Calculate streak status
      if (!lastDate) {
        // First confession ever
        return {
          ...streakInfo,
          ...profile,
          shouldReset: false,
          isFirstToday: true
        };
      }

      const daysDiff = Math.floor(
        (new Date(today).getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysDiff === 0) {
        // Already confessed today
        return {
          ...streakInfo,
          ...profile,
          shouldReset: false,
          isFirstToday: false
        };
      } else if (daysDiff === 1) {
        // Streak continues
        return {
          ...streakInfo,
          ...profile,
          shouldReset: false,
          isFirstToday: true
        };
      } else {
        // Streak broken
        return {
          ...streakInfo,
          ...profile,
          shouldReset: true,
          isFirstToday: true
        };
      }
    } catch (error) {
      console.error('Error checking streak:', error);
      return null;
    }
  }, [user]);

  // Calculate points based on streak
  const calculatePoints = (streak: number, isVIP: boolean): number => {
    const basePoints: Record<number, number> = {
      3: 10,
      7: 50,
      14: 100,
      30: 200
    };

    let points = 1; // Default daily point
    
    // Check milestones
    Object.entries(basePoints).forEach(([days, pts]) => {
      if (streak === parseInt(days)) {
        points = isVIP ? pts * 2 : pts; // VIP double rewards
      }
    });

    return points;
  };

  // Update streak after confession
  const updateStreak = useCallback(async () => {
    if (!user) return;

    const streakStatus = await checkStreak();
    if (!streakStatus || !streakStatus.isFirstToday) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const isVIP = streakStatus.subscription_status === 'active';
      
      const newStreak = streakStatus.shouldReset ? 1 : streakStatus.current_streak + 1;
      const points = calculatePoints(newStreak, isVIP);
      const newTotal = streakStatus.total_points + points;
      const newLevel = Math.floor(newTotal / 100) + 1;

      // Update streak
      await supabase
        .from('user_streaks')
        .update({
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, streakStatus.longest_streak),
          last_confession_date: today
        })
        .eq('user_id', user.id);

      // Update profile points
      await supabase
        .from('profiles')
        .update({
          total_points: newTotal,
          level: newLevel
        })
        .eq('user_id', user.id);

      // Check for badge unlocks
      await checkBadgeUnlocks(newStreak, newTotal);

      // Show success message
      if (newStreak > 1) {
        toast.success(
          `🔥 ${newStreak} day streak! +${points} points`,
          { duration: 5000 }
        );
      }

      // Reload data
      await loadStreakData();
      
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  }, [user, checkStreak, loadStreakData, t]);

  // Check and award badges
  const checkBadgeUnlocks = async (streak: number, points: number) => {
    if (!user) return;

    try {
      // Get badges for streak milestones
      const { data: badges } = await supabase
        .from('badges')
        .select('id, requirement_type, requirement_value')
        .eq('requirement_type', 'streak_days')
        .lte('requirement_value', streak);

      if (badges) {
        for (const badge of badges) {
          // Try to award badge (will fail silently if already exists due to unique constraint)
          await supabase
            .from('user_badges')
            .insert({
              user_id: user.id,
              badge_id: badge.id
            })
            .select()
            .single()
            .then(({ data, error }) => {
              // Only show toast if badge was newly awarded (no error)
              if (data && !error) {
                toast.success('🎉 New badge unlocked!', {
                  duration: 5000
                });
              }
            });
          // Ignore errors (badge already exists)
        }
      }
    } catch (error) {
      console.error('Error checking badge unlocks:', error);
    }
  };

  return {
    streakData,
    loading,
    updateStreak,
    checkStreak,
    refreshData: loadStreakData
  };
};
