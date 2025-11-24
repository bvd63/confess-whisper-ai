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
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 backdrop-blur-2xl bg-background/80 border-b border-border/50 shadow-ios">
          <div className="flex items-center gap-4 px-5 py-5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="hover:bg-accent rounded-xl h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-2xl">
                <Trophy className="h-6 w-6 text-amber-500" />
              </div>
              <h1 className="text-2xl font-bold">Rewards</h1>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue={initialTab} className="px-5 py-6">
          <TabsList className="grid w-full grid-cols-4 h-12 bg-muted/30 rounded-2xl p-1 mb-8">
            <TabsTrigger value="overview" className="rounded-xl text-sm data-[state=active]:bg-background data-[state=active]:shadow-ios">
              <Star className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="achievements" className="rounded-xl text-sm data-[state=active]:bg-background data-[state=active]:shadow-ios">
              <Award className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Badges</span>
            </TabsTrigger>
            <TabsTrigger value="daily" className="rounded-xl text-sm data-[state=active]:bg-background data-[state=active]:shadow-ios">
              <Flame className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Daily</span>
            </TabsTrigger>
            <TabsTrigger value="referrals" className="rounded-xl text-sm data-[state=active]:bg-background data-[state=active]:shadow-ios">
              <Gift className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Refer</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Level & Progress Card */}
            <Card className="p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20 rounded-2xl shadow-card">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-3xl font-bold mb-1">Level {streakData?.level || 1}</h3>
                  <p className="text-sm text-muted-foreground">
                    {streakData?.totalPoints || 0} Points Earned
                  </p>
                </div>
                <div className="p-4 bg-amber-500/20 rounded-2xl">
                  <TrendingUp className="w-8 h-8 text-amber-500" />
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Next Level Progress</span>
                  <span className="font-bold text-amber-500">{levelProgress}/100</span>
                </div>
                <Progress value={levelProgress} className="h-3 rounded-full" />
              </div>
            </Card>

            {/* Streak Status */}
            {streakData && streakData.currentStreak > 0 && (
              <Card className="p-5 bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/20 rounded-2xl shadow-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-orange-500/20 rounded-2xl">
                      <Flame className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-base font-bold">
                        🔥 {streakData.currentStreak} Day Streak
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Best: {streakData.longestStreak} days
                      </p>
                    </div>
                  </div>
                  {streakData.isVIP && (
                    <div className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full">
                      <span className="text-xs font-bold text-white">👑 2x Boost</span>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Coins Balance */}
            <CoinsDisplay userId={user.id} variant="full" />

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-5 rounded-2xl shadow-card hover:shadow-elevated transition-shadow">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-2 bg-amber-500/10 rounded-xl">
                    <Award className="w-5 h-5 text-amber-500" />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">Badges</span>
                </div>
                <p className="text-3xl font-bold text-amber-500">
                  {badgesCount}
                </p>
              </Card>

              <Card className="p-5 rounded-2xl shadow-card hover:shadow-elevated transition-shadow">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-2 bg-green-500/10 rounded-xl">
                    <Gift className="w-5 h-5 text-green-500" />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">Referrals</span>
                </div>
                <p className="text-3xl font-bold text-green-500">
                  {referralsCount}
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
                    <span className="text-lg">🔥</span>
                    <span>5 days streak</span>
                  </span>
                  <span className="font-semibold text-orange-500">+20 coins</span>
                </li>
                <li className="flex items-center justify-between p-2 bg-background rounded-md">
                  <span className="flex items-center gap-2">
                    <span className="text-lg">🔥</span>
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
