import { ArrowLeft, Trophy, Flame, Gift, Award, Star, Coins as CoinsIcon, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import AppLayout from '@/components/AppLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { StreakDisplay } from '@/components/StreakDisplay';
import { RateLimitIndicator } from '@/components/RateLimitIndicator';
import { useConfessionRateLimit } from '@/hooks/useConfessionRateLimit';
import { useStreakManager } from '@/hooks/useStreakManager';
import ReferralSystem from '@/components/ReferralSystem';
import BadgesDisplay from '@/components/BadgesDisplay';
import { FlairsShopButton } from '@/components/FlairsShopButton';
import { FlairsShop } from '@/components/FlairsShop';
import CoinsDisplay from '@/components/CoinsDisplay';
import { useSubscription } from '@/state/SubscriptionProvider';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

const Rewards = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, isLoading } = useCurrentUser();
  const { 
    remainingRequests, 
    totalRequests, 
    getRemainingTime, 
    isLimited 
  } = useConfessionRateLimit();
  const { streakData } = useStreakManager();
  const { subscriptionTier } = useSubscription();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'overview';
  const [flairsShopOpen, setFlairsShopOpen] = useState(false);

  // Navigate to auth if no user
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [isLoading, user, navigate]);

  if (isLoading) {
    return null;
  }

  if (!user) {
    return null;
  }

  const isVIP = subscriptionTier === 'vip';
  const levelProgress = streakData ? (streakData.totalPoints % 100) : 0;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/50">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="hover:bg-accent"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-amber-500" />
                <h1 className="text-2xl font-bold">Rewards Hub</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue={initialTab} className="px-4 py-4">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              <Star className="w-4 h-4 mr-1" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="achievements" className="text-xs sm:text-sm">
              <Award className="w-4 h-4 mr-1" />
              Achievements
            </TabsTrigger>
            <TabsTrigger value="daily" className="text-xs sm:text-sm">
              <Flame className="w-4 h-4 mr-1" />
              Daily
            </TabsTrigger>
            <TabsTrigger value="referrals" className="text-xs sm:text-sm">
              <Gift className="w-4 h-4 mr-1" />
              Referrals
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Level & Progress Card */}
            <Card className="p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold">Level {streakData?.level || 1}</h3>
                  <p className="text-sm text-muted-foreground">
                    {streakData?.totalPoints || 0} Total Points
                  </p>
                </div>
                <div className="p-3 bg-amber-500/20 rounded-full">
                  <TrendingUp className="w-8 h-8 text-amber-500" />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress to Level {(streakData?.level || 1) + 1}</span>
                  <span className="font-semibold">{levelProgress}/100</span>
                </div>
                <Progress value={levelProgress} className="h-2" />
              </div>
            </Card>

            {/* Streak Status */}
            {streakData && streakData.currentStreak > 0 && (
              <Card className="p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/20 rounded-full">
                      <Flame className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">
                        {streakData.currentStreak} Day Streak 🔥
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Best: {streakData.longestStreak} days
                      </p>
                    </div>
                  </div>
                  {streakData.isVIP && (
                    <div className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full">
                      <span className="text-xs font-semibold text-purple-400">2x Rewards</span>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Coins Balance */}
            <CoinsDisplay userId={user.id} variant="full" />

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Badges Earned</span>
                </div>
                <p className="text-2xl font-bold">
                  {/* This will be populated from BadgesDisplay */}
                  -
                </p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Gift className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Referrals</span>
                </div>
                <p className="text-2xl font-bold">
                  {/* This will be populated from ReferralSystem */}
                  -
                </p>
              </Card>
            </div>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Your Badges</h2>
                {isVIP && (
                  <FlairsShopButton 
                    onClick={() => setFlairsShopOpen(true)} 
                    tier="vip" 
                  />
                )}
              </div>
              
              <BadgesDisplay userId={user.id} variant="full" />
            </div>
          </TabsContent>

          {/* Daily Rewards Tab */}
          <TabsContent value="daily" className="space-y-4">
            {/* Current Streak & Milestones */}
            <div>
              <h3 className="font-semibold mb-3 text-lg">Current Streak & Rewards</h3>
              <StreakDisplay />
            </div>

            {/* Daily Confession Limit */}
            <div>
              <h3 className="font-semibold mb-3 text-lg">Daily Confession Limit</h3>
              <RateLimitIndicator
                remaining={remainingRequests}
                total={totalRequests}
                resetTime={getRemainingTime()}
                isLimited={isLimited}
              />
            </div>

            {/* Info Card */}
            <Card className="p-4 bg-muted/30">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                Streak Milestones
              </h4>
              <p className="text-xs text-muted-foreground mb-3">
                Keep your streak alive and earn bonus coins automatically!
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center justify-between p-2 bg-background rounded-md">
                  <span className="flex items-center gap-2">
                    <span className="text-lg">🔥</span>
                    <span>3 days streak</span>
                  </span>
                  <span className="font-semibold text-amber-500">+10 coins</span>
                </li>
                <li className="flex items-center justify-between p-2 bg-background rounded-md">
                  <span className="flex items-center gap-2">
                    <span className="text-lg">🔥🔥</span>
                    <span>5 days streak</span>
                  </span>
                  <span className="font-semibold text-orange-500">+20 coins</span>
                </li>
                <li className="flex items-center justify-between p-2 bg-background rounded-md">
                  <span className="flex items-center gap-2">
                    <span className="text-lg">🔥🔥🔥</span>
                    <span>7 days streak</span>
                  </span>
                  <span className="font-semibold text-red-500">+50 coins</span>
                </li>
              </ul>
            </Card>
          </TabsContent>

          {/* Referrals Tab */}
          <TabsContent value="referrals" className="space-y-4">
            <ReferralSystem userId={user.id} />
          </TabsContent>
        </Tabs>

        {/* Flairs Shop Dialog */}
        {flairsShopOpen && (
          <FlairsShop 
            userId={user.id}
            open={flairsShopOpen} 
            onOpenChange={setFlairsShopOpen} 
          />
        )}
      </div>
    </AppLayout>
  );
};

export default Rewards;
