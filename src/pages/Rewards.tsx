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
        <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 mb-8 glass-strong border-b border-border/50 backdrop-blur-xl">
          <div className="flex items-center justify-between px-6 sm:px-8 py-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="hover:bg-muted rounded-full h-12 w-12"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-[18px] bg-gradient-to-br from-[#FFD700] via-[#FFC700] to-[#FFB700] flex items-center justify-center shadow-xl shadow-[#FFD700]/30">
                  <Trophy className="h-6 w-6 text-[#1A1A1F] dark:text-[#0B0B0F]" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Rewards Hub</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue={initialTab} className="py-6">
          <TabsList className="grid w-full grid-cols-4 mb-8 h-14 rounded-full bg-secondary/50 dark:bg-secondary/30 p-2 gap-2 border border-border/50">
            <TabsTrigger value="overview" className="text-sm rounded-full h-full data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-border/30 font-semibold transition-all">
              <Star className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="achievements" className="text-sm rounded-full h-full data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-border/30 font-semibold transition-all">
              <Award className="w-4 h-4 mr-2" />
              <span className="hidden xs:inline">Badges</span>
            </TabsTrigger>
            <TabsTrigger value="daily" className="text-sm rounded-full h-full data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-border/30 font-semibold transition-all">
              <Flame className="w-4 h-4 mr-2" />
              <span className="hidden xs:inline">Daily</span>
            </TabsTrigger>
            <TabsTrigger value="referrals" className="text-sm rounded-full h-full data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-border/30 font-semibold transition-all">
              <Gift className="w-4 h-4 mr-2" />
              <span className="hidden xs:inline">Refer</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Level & Progress Card */}
            <Card className="p-8 bg-gradient-to-br from-[#FFD700]/10 via-[#FFC700]/10 to-[#FFB700]/10 dark:from-[#FFD700]/15 dark:to-[#FFB700]/20 border-[#FFD700]/30 rounded-[20px] shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-3xl font-bold text-foreground">Level {streakData?.level || 1}</h3>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">
                    {streakData?.totalPoints || 0} Total Points
                  </p>
                </div>
                <div className="p-4 bg-[#FFD700]/20 dark:bg-[#FFD700]/30 rounded-[18px] shadow-lg">
                  <TrendingUp className="w-8 h-8 text-[#FFD700]" />
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Progress to Level {(streakData?.level || 1) + 1}</span>
                  <span className="font-bold text-[#FFD700]">{levelProgress}/100</span>
                </div>
                <Progress value={levelProgress} className="h-3 rounded-full" />
              </div>
            </Card>

            {/* Streak Status */}
            {streakData && streakData.currentStreak > 0 && (
              <Card className="p-6 bg-gradient-to-r from-[#FF7A00]/10 via-[#FF8C00]/10 to-[#FF7A00]/10 dark:from-[#FF7A00]/20 dark:to-[#FF8C00]/25 border-[#FF7A00]/30 rounded-[20px] shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#FF7A00]/20 dark:bg-[#FF7A00]/30 rounded-[16px] shadow-md">
                      <Flame className="w-6 h-6 text-[#FF7A00]" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-foreground">
                        {streakData.currentStreak} Day Streak 🔥
                      </p>
                      <p className="text-sm text-muted-foreground font-medium mt-0.5">
                        Best: {streakData.longestStreak} days
                      </p>
                    </div>
                  </div>
                  {streakData.isVIP && (
                    <div className="px-4 py-2 bg-[#9C27FF]/20 dark:bg-[#B266FF]/30 border border-[#9C27FF]/30 rounded-full shadow-md">
                      <span className="text-xs font-bold text-[#9C27FF] dark:text-[#B266FF]">2x Rewards</span>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Coins Balance */}
            <CoinsDisplay userId={user.id} variant="full" />

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-5">
              <Card className="p-6 rounded-[20px] border-border/50 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-2.5 mb-3">
                  <Award className="w-5 h-5 text-[#FDE047]" />
                  <span className="text-sm text-muted-foreground font-semibold">Badges</span>
                </div>
                <p className="text-3xl font-bold text-[#FDE047]">
                  {badgesCount}
                </p>
              </Card>

              <Card className="p-6 rounded-[20px] border-border/50 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-2.5 mb-3">
                  <Gift className="w-5 h-5 text-[#22C55E]" />
                  <span className="text-sm text-muted-foreground font-semibold">Referrals</span>
                </div>
                <p className="text-3xl font-bold text-[#22C55E]">
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
            <Card className="p-6 bg-muted/30 dark:bg-muted/20 rounded-[20px] border-border/50">
              <h4 className="font-bold text-base mb-3 flex items-center gap-2.5">
                <Flame className="w-5 h-5 text-[#FF7A00]" />
                Streak Milestones
              </h4>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Keep your streak alive and earn bonus coins automatically!
              </p>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center justify-between p-3 bg-background rounded-[16px] border border-border/30 shadow-sm">
                  <span className="flex items-center gap-3">
                    <span className="text-xl">🔥</span>
                    <span className="font-medium">3 days streak</span>
                  </span>
                  <span className="font-bold text-[#FFD700]">+10 🪙</span>
                </li>
                <li className="flex items-center justify-between p-3 bg-background rounded-[16px] border border-border/30 shadow-sm">
                  <span className="flex items-center gap-3">
                    <span className="text-xl">🔥🔥</span>
                    <span className="font-medium">5 days streak</span>
                  </span>
                  <span className="font-bold text-[#FF7A00]">+20 🪙</span>
                </li>
                <li className="flex items-center justify-between p-3 bg-background rounded-[16px] border border-border/30 shadow-sm">
                  <span className="flex items-center gap-3">
                    <span className="text-xl">🔥🔥🔥</span>
                    <span className="font-medium">7 days streak</span>
                  </span>
                  <span className="font-bold text-[#EF4444]">+50 🪙</span>
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
