import { Flame, Trophy, Star, Crown } from 'lucide-react';
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
    <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 dark:from-orange-500/20 dark:to-red-500/20 rounded-3xl p-6 border border-orange-500/20 shadow-card">
      <div className="flex items-center justify-between">
        {/* Current Streak */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center shadow-ios">
              <Flame className="w-7 h-7 text-orange-500 dark:text-orange-400" />
            </div>
            {streakData.currentStreak > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-elevated">
                {streakData.currentStreak}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Current Streak</p>
            <p className="text-3xl font-bold text-foreground">
              {streakData.currentStreak} <span className="text-lg text-muted-foreground">{t.days || 'days'}</span>
            </p>
          </div>
        </div>

        {/* Points & Level */}
        <div className="text-right">
          <div className="flex items-center gap-2 justify-end mb-2">
            <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Star className="w-4 h-4 text-yellow-500 dark:text-yellow-400 fill-current" />
            </div>
            <span className="text-base font-bold text-foreground">
              {streakData.totalPoints}
            </span>
          </div>
          <div className="text-xs font-semibold text-muted-foreground">
            Level {streakData.level}
          </div>
        </div>
      </div>

      {/* Progress to next milestone */}
      {streakData.currentStreak < 30 && (
        <div className="mt-5">
          <div className="flex justify-between text-xs font-semibold text-muted-foreground mb-2">
            <span>Next milestone</span>
            <span>{getNextMilestone(streakData.currentStreak)} {t.days || 'days'}</span>
          </div>
          <div className="h-3 bg-muted/50 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500 shadow-ios rounded-full"
              style={{ width: `${getProgressPercentage(streakData.currentStreak)}%` }}
            />
          </div>
        </div>
      )}

      {/* VIP Double Rewards Badge */}
      {streakData.isVIP && (
        <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 rounded-xl border border-yellow-500/20">
          <Crown className="w-4 h-4 text-yellow-600 fill-current" />
          <span className="text-xs font-bold text-yellow-600">VIP 2x rewards active</span>
        </div>
      )}
    </div>
  );
};
