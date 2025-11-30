import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import AppLayout from '@/components/AppLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useStreakManager } from '@/hooks/useStreakManager';
import { useCoins } from '@/hooks/useCoins';
import { useEffect } from 'react';

const RewardsSimplified = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, isLoading } = useCurrentUser();
  const { streakData } = useStreakManager();
  const { balance } = useCoins(user?.id);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [isLoading, user, navigate]);

  if (isLoading || !user) {
    return null;
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 pb-32">
        {/* Header */}
        <div className="sticky top-0 z-10 -mx-4 mb-8 glass-strong border-b border-border">
          <div className="flex items-center gap-3 px-4 py-5">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)} 
              className="hover:bg-muted rounded-2xl h-12 w-12"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold gradient-text">
              ConfessAI
            </h1>
          </div>
        </div>

        {/* Rewards Hub Title */}
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-8 text-primary">
          Rewards Hub
        </h2>

        {/* Coins Balance - Large Display */}
        <div className="flex flex-col items-center justify-center mb-12">
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-xl">
              <span className="text-6xl">🪙</span>
              <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
                <span className="text-xl font-bold text-white">+</span>
              </div>
            </div>
          </div>
          <h3 className="text-5xl font-bold text-foreground mb-2">
            {balance} <span className="text-3xl font-semibold text-foreground-secondary">Coins</span>
          </h3>
        </div>

        {/* Daily Streak */}
        <div className="flex items-center justify-center gap-3 mb-12 text-foreground-secondary">
          <span className="text-2xl">🔥</span>
          <span className="text-lg font-medium">
            Daily streak: <span className="font-bold text-foreground">{streakData?.currentStreak || 0}</span> days
          </span>
        </div>

        {/* Action Cards */}
        <div className="space-y-4">
          {/* Boost Confession */}
          <div 
            className="p-6 rounded-3xl bg-gradient-to-br from-purple-900/20 via-purple-800/15 to-purple-900/20 border border-purple-500/30 hover:border-purple-500/50 transition-all cursor-pointer"
            onClick={() => {
              // Navigate to home or show info
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                  <span className="text-2xl">⚡</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Boost Confession</h3>
                  <p className="text-sm text-foreground-secondary">Make your confession stand out</p>
                </div>
              </div>
              <span className="text-lg font-bold text-primary">25 coins</span>
            </div>
          </div>

          {/* Highlight Comment */}
          <div 
            className="p-6 rounded-3xl bg-gradient-to-br from-amber-900/20 via-amber-800/15 to-amber-900/20 border border-amber-500/30 hover:border-amber-500/50 transition-all cursor-pointer"
            onClick={() => {
              // Navigate to home or show info
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                  <span className="text-2xl">⭐</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Highlight Comment</h3>
                  <p className="text-sm text-foreground-secondary">Pin your comment for 24h</p>
                </div>
              </div>
              <span className="text-lg font-bold text-amber-500">15 coins</span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default RewardsSimplified;
