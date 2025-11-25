import { Flame, Trophy, Star } from 'lucide-react';
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
    <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-2xl p-5 border border-orange-500/20">
      <div className="flex items-center justify-between">
        {/* Current Streak */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Flame className="w-10 h-10 text-orange-500" />
            {streakData.currentStreak > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
                {streakData.currentStreak}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Current Streak</p>
            <p className="text-2xl font-bold">
              {streakData.currentStreak} {t.days || 'days'}
            </p>
          </div>
        </div>

        {/* Points & Level */}
        <div className="text-right">
          <div className="flex items-center gap-2 justify-end mb-1">
            <Star className="w-5 h-5 text-yellow-500" />
            <span className="text-base font-semibold">
              {streakData.totalPoints}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            Level {streakData.level}
          </div>
        </div>
      </div>

      {/* Progress to next milestone */}
      {streakData.currentStreak < 30 && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Next milestone</span>
            <span className="font-medium">{getNextMilestone(streakData.currentStreak)} {t.days || 'days'}</span>
          </div>
          <div className="h-2.5 bg-background/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500"
              style={{ width: `${getProgressPercentage(streakData.currentStreak)}%` }}
            />
          </div>
        </div>
      )}

      {/* VIP Double Rewards Badge */}
      {streakData.isVIP && (
        <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
          <span className="text-base">✨</span>
          <span className="text-sm font-medium text-purple-400">VIP 2x rewards active</span>
        </div>
      )}
    </div>
  );
};
