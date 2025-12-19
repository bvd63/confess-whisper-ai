import { Flame } from 'lucide-react';
import { useStreakManager } from '@/hooks/useStreakManager';
import { useLanguage } from '@/contexts/LanguageContext';

export const StreakDisplay = () => {
  const { streakData, loading } = useStreakManager();
  const { t } = useLanguage();

  if (loading || !streakData) return null;

  const getNextMilestone = (current: number): number => {
    const milestones = [3, 7, 14, 30];
    return milestones.find(m => m > current) || 30;
  };

  const getProgressPercentage = (current: number): number => {
    const next = getNextMilestone(current);
    const prev = [0, 3, 7, 14].reverse().find(m => m <= current) || 0;
    return ((current - prev) / (next - prev)) * 100;
  };

  return (
    <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl p-4 border border-orange-500/20">
      <div className="flex items-center justify-between">
        {/* Current Streak */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Flame className="w-8 h-8 text-orange-500" />
            {streakData.currentStreak > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {streakData.currentStreak}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium">Current Streak</p>
            <p className="text-2xl font-bold">
              {streakData.currentStreak} {t.days || 'days'}
            </p>
          </div>
        </div>
      </div>

      {/* Progress to next milestone */}
      {streakData.currentStreak < 30 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Next milestone</span>
            <span>{getNextMilestone(streakData.currentStreak)} {t.days || 'days'}</span>
          </div>
          <div className="h-2 bg-background/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500"
              style={{ width: `${getProgressPercentage(streakData.currentStreak)}%` }}
            />
          </div>
        </div>
      )}

      {/* VIP Double Rewards Badge */}
      {streakData.isVIP && (
        <div className="mt-3 flex items-center gap-2 text-xs text-vip-gold">
          <span className="drop-shadow-[0_0_4px_rgba(234,179,8,0.6)]">👑</span>
          <span>{t.vip_double_rewards_active}</span>
        </div>
      )}
    </div>
  );
};
