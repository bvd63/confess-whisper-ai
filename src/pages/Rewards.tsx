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
        <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 mb-8 glass-strong border-b border-border">
          <div className="flex items-center gap-3 px-4 sm:px-6 py-5">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-muted rounded-2xl h-12 w-12">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold gradient-text">ConfessAI</h1>
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
          <CoinsDisplay userId={user.id} variant="full" />
        </div>

        {/* Daily Streak - Simple Line */}
        <div className="flex items-center justify-center gap-3 mb-12 text-foreground-secondary">
          <span className="text-2xl">🔥</span>
          <span className="text-lg font-medium">
            Daily streak: <span className="font-bold text-foreground">{streakData?.currentStreak || 0}</span> days
          </span>
        </div>

        {/* Action Cards */}
        <div className="space-y-4">
          {/* Boost Confession */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-900/20 via-purple-800/15 to-purple-900/20 border border-purple-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                  <span className="text-2xl">⚡</span>
                </div>
                <span className="text-lg font-bold text-foreground">Boost Confession</span>
              </div>
              <span className="text-lg font-bold text-primary">25 coins</span>
            </div>
          </div>

          {/* Highlight Comment */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-900/20 via-amber-800/15 to-amber-900/20 border border-amber-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                  <span className="text-2xl">⭐</span>
                </div>
                <span className="text-lg font-bold text-foreground">Highlight Comment</span>
              </div>
              <span className="text-lg font-bold text-amber-500">15 coins</span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>;
};
export default Rewards;
