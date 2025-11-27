import { ArrowLeft, Trophy, Flame, Gift, Award, Star, Coins as CoinsIcon, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
import { logError } from '@/lib/logger';

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
  const [badgesCount, setBadgesCount] = useState(0);
  const [referralsCount, setReferralsCount] = useState(0);

  // Navigate to auth if no user
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [isLoading, user, navigate]);

  // Load badges count
  useEffect(() => {
    const loadBadgesCount = async () => {
      if (!user?.id) return;
      try {
        const { count } = await supabase
          .from('user_badges')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .or('expires_at.is.null,expires_at.gt.now()');
        setBadgesCount(count || 0);
      } catch (error) {
        logError('Error loading badges count', error as Error);
      }
    };
    loadBadgesCount();
  }, [user?.id]);

  // Load referrals count
  useEffect(() => {
    const loadReferralsCount = async () => {
      if (!user?.id) return;
      try {
        const { count } = await supabase
          .from('referrals')
          .select('*', { count: 'exact', head: true })
          .eq('referrer_user_id', user.id)
          .eq('status', 'completed');
        setReferralsCount(count || 0);
      } catch (error) {
        logError('Error loading referrals count', error as Error);
      }
    };
    loadReferralsCount();
  }, [user?.id]);

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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-24">
        {/* Header */}
        <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 mb-8 backdrop-blur-xl bg-background/80 border-b border-border/50">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="hover:bg-accent/50 rounded-2xl h-11 w-11 transition-all duration-150 active:scale-95"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-2xl font-semibold text-foreground">Rewards Hub</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue={initialTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 mb-6 h-12 rounded-2xl bg-muted/50 backdrop-blur-sm p-1 gap-1">
            <TabsTrigger 
              value="overview" 
              className="text-sm rounded-xl h-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30 font-medium transition-all duration-150 active:scale-97"
            >
              <Star className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger 
              value="achievements" 
              className="text-sm rounded-xl h-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30 font-medium transition-all duration-150 active:scale-97"
            >
              <Award className="w-4 h-4 mr-1.5" />
              <span className="hidden xs:inline">Badges</span>
            </TabsTrigger>
            <TabsTrigger 
              value="daily" 
              className="text-sm rounded-xl h-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30 font-medium transition-all duration-150 active:scale-97"
            >
              <Flame className="w-4 h-4 mr-1.5" />
              <span className="hidden xs:inline">Daily</span>
            </TabsTrigger>
            <TabsTrigger 
              value="referrals" 
              className="text-sm rounded-xl h-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30 font-medium transition-all duration-150 active:scale-97"
            >
              <Gift className="w-4 h-4 mr-1.5" />
              <span className="hidden xs:inline">Refer</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Level & Progress Card */}
            <Card className="p-6 bg-gradient-to-br from-purple-500/10 via-purple-600/5 to-purple-700/10 border-purple-500/20 rounded-2xl shadow-lg shadow-purple-500/10 backdrop-blur-sm transition-all duration-150 hover:shadow-xl hover:shadow-purple-500/20 active:scale-[0.99]">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-2xl font-semibold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">Level {streakData?.level || 1}</h3>
                  <p className="text-sm text-muted-foreground font-medium mt-1">
                    {streakData?.totalPoints || 0} Total Points
                  </p>
                </div>
                <div className="p-3 bg-purple-500/20 rounded-2xl backdrop-blur-sm">
                  <TrendingUp className="w-7 h-7 text-purple-400" />
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Progress to Level {(streakData?.level || 1) + 1}</span>
                  <span className="font-semibold text-foreground">{levelProgress}/100</span>
                </div>
                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted/50">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500 rounded-full shadow-sm shadow-purple-500/50"
                    style={{ width: `${levelProgress}%` }}
                  />
                </div>
              </div>
            </Card>

            {/* Streak Status */}
            {streakData && streakData.currentStreak > 0 && (
              <Card className="p-5 bg-gradient-to-r from-orange-500/10 via-orange-600/5 to-red-500/10 border-orange-500/20 rounded-2xl shadow-lg shadow-orange-500/10 backdrop-blur-sm transition-all duration-150 hover:shadow-xl hover:shadow-orange-500/20 active:scale-[0.99]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-orange-500/20 rounded-2xl backdrop-blur-sm">
                      <Flame className="w-6 h-6 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {streakData.currentStreak} Day Streak 🔥
                      </p>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5">
                        Best: {streakData.longestStreak} days
                      </p>
                    </div>
                  </div>
                  {streakData.isVIP && (
                    <div className="px-3 py-1.5 bg-gradient-to-r from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-full backdrop-blur-sm">
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
              <Card className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20 shadow-lg shadow-amber-500/10 backdrop-blur-sm transition-all duration-150 hover:shadow-xl hover:shadow-amber-500/20 active:scale-[0.99]">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span className="text-xs text-muted-foreground font-medium">Badges</span>
                </div>
                <p className="text-3xl font-semibold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                  {badgesCount}
                </p>
              </Card>

              <Card className="p-5 rounded-2xl bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 shadow-lg shadow-green-500/10 backdrop-blur-sm transition-all duration-150 hover:shadow-xl hover:shadow-green-500/20 active:scale-[0.99]">
                <div className="flex items-center gap-2 mb-3">
                  <Gift className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-muted-foreground font-medium">Referrals</span>
                </div>
                <p className="text-3xl font-semibold bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
                  {referralsCount}
                </p>
              </Card>
            </div>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-6">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Your Badges</h2>
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
          <TabsContent value="daily" className="space-y-6">
            {/* Current Streak & Milestones */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg text-foreground">Current Streak & Rewards</h3>
              <StreakDisplay />
            </div>

            {/* Daily Confession Limit */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg text-foreground">Daily Confession Limit</h3>
              <RateLimitIndicator
                remaining={remainingRequests}
                total={totalRequests}
                resetTime={getRemainingTime()}
                isLimited={isLimited}
              />
            </div>

            {/* Info Card */}
            <Card className="p-5 bg-gradient-to-br from-orange-500/10 via-orange-600/5 to-red-500/10 border-orange-500/20 rounded-2xl shadow-lg shadow-orange-500/10 backdrop-blur-sm">
              <h4 className="font-semibold mb-2 flex items-center gap-2 text-foreground">
                <Flame className="w-5 h-5 text-orange-400" />
                Streak Milestones
              </h4>
              <p className="text-sm text-muted-foreground mb-4 font-medium">
                Keep your streak alive and earn bonus coins automatically!
              </p>
              <ul className="space-y-2.5">
                <li className="flex items-center justify-between p-3 bg-background/50 backdrop-blur-sm rounded-xl border border-border/50 transition-all duration-150 hover:bg-background/80 active:scale-[0.99]">
                  <span className="flex items-center gap-3 font-medium text-foreground">
                    <span className="text-xl">🔥</span>
                    <span>3 days streak</span>
                  </span>
                  <span className="font-semibold text-amber-500 text-sm">+10 coins</span>
                </li>
                <li className="flex items-center justify-between p-3 bg-background/50 backdrop-blur-sm rounded-xl border border-border/50 transition-all duration-150 hover:bg-background/80 active:scale-[0.99]">
                  <span className="flex items-center gap-3 font-medium text-foreground">
                    <span className="text-xl">🔥🔥</span>
                    <span>5 days streak</span>
                  </span>
                  <span className="font-semibold text-orange-500 text-sm">+20 coins</span>
                </li>
                <li className="flex items-center justify-between p-3 bg-background/50 backdrop-blur-sm rounded-xl border border-border/50 transition-all duration-150 hover:bg-background/80 active:scale-[0.99]">
                  <span className="flex items-center gap-3 font-medium text-foreground">
                    <span className="text-xl">🔥🔥🔥</span>
                    <span>7 days streak</span>
                  </span>
                  <span className="font-semibold text-red-500 text-sm">+50 coins</span>
                </li>
              </ul>
            </Card>
          </TabsContent>

          {/* Referrals Tab */}
          <TabsContent value="referrals" className="space-y-5">
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
