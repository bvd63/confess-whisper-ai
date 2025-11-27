import { ArrowLeft, Trophy, Flame, Gift, Award, Star, Coins as CoinsIcon } from 'lucide-react';
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
import { useStreakManager } from '@/hooks/useStreakManager';
import { useConfessionLimits } from '@/hooks/useConfessionLimits';
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
  const {
    t
  } = useLanguage();
  const {
    user,
    isLoading
  } = useCurrentUser();
  const {
    canPost,
    currentCount,
    dailyLimit,
    remaining,
    tier
  } = useConfessionLimits();
  const {
    streakData
  } = useStreakManager();
  const {
    subscriptionTier
  } = useSubscription();
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
        const {
          count
        } = await supabase.from('user_badges').select('*', {
          count: 'exact',
          head: true
        }).eq('user_id', user.id).or('expires_at.is.null,expires_at.gt.now()');
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
        const {
          count
        } = await supabase.from('referrals').select('*', {
          count: 'exact',
          head: true
        }).eq('referrer_user_id', user.id).eq('status', 'completed');
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
  return <AppLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-24">
        {/* Header */}
        <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 mb-6 glass-strong border-b border-border">
          <div className="flex items-center justify-between px-4 sm:px-6 py-5">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-muted rounded-2xl h-12 w-12">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-flame to-warning flex items-center justify-center shadow-lg shadow-flame/25 text-background bg-background">
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Rewards Hub</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue={initialTab} className="py-6">
          <TabsList className="grid w-full grid-cols-4 mb-8 h-14 rounded-2xl bg-muted p-1.5 gap-1.5">
            <TabsTrigger value="overview" className="text-sm rounded-xl h-full data-[state=active]:bg-card data-[state=active]:shadow-lg font-medium">
              <Star className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="achievements" className="text-sm rounded-xl h-full data-[state=active]:bg-card data-[state=active]:shadow-lg font-medium">
              <Award className="w-4 h-4 mr-1.5" />
              <span className="hidden xs:inline">Badges</span>
            </TabsTrigger>
            <TabsTrigger value="daily" className="text-sm rounded-xl h-full data-[state=active]:bg-card data-[state=active]:shadow-lg font-medium">
              <Flame className="w-4 h-4 mr-1.5" />
              <span className="hidden xs:inline">Daily</span>
            </TabsTrigger>
            <TabsTrigger value="referrals" className="text-sm rounded-lg">
              <Gift className="w-4 h-4 mr-1" />
              <span className="hidden xs:inline">Refer</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-5">
            {/* Coins Balance */}
            <CoinsDisplay userId={user.id} variant="full" />

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-5 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">Badges</span>
                </div>
                <p className="text-2xl font-bold text-amber-500">
                  {badgesCount}
                </p>
              </Card>

              <Card className="p-5 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <Gift className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">Referrals</span>
                </div>
                <p className="text-2xl font-bold text-green-500">
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
                {isVIP && <FlairsShopButton onClick={() => setFlairsShopOpen(true)} tier="vip" />}
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
              <div className="p-5 rounded-2xl border bg-card">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    {tier === 'vip' ? 'Unlimited' : 'Confessions Today'}
                  </span>
                  <span className="text-sm font-semibold">
                    {tier === 'vip' ? '∞' : `${currentCount}/${dailyLimit}`}
                  </span>
                </div>
                {tier !== 'vip' && (
                  <Progress 
                    value={(currentCount / dailyLimit) * 100} 
                    className="h-2"
                  />
                )}
                <p className="text-xs text-muted-foreground mt-3">
                  {tier === 'vip' 
                    ? 'As a VIP member, you have unlimited confessions!' 
                    : `You have ${remaining} confession${remaining !== 1 ? 's' : ''} remaining today.`}
                </p>
              </div>
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
        {flairsShopOpen && <FlairsShop userId={user.id} open={flairsShopOpen} onOpenChange={setFlairsShopOpen} />}
      </div>
    </AppLayout>;
};
export default Rewards;