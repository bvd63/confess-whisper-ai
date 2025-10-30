import { useState, useEffect, useCallback, Suspense, lazy, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EnhancedButton } from "@/components/EnhancedButton";
import { AnimatedCard } from "@/components/AnimatedCard";
import { GradientText } from "@/components/GradientText";
import { FloatingElement } from "@/components/FloatingElement";
import { User, Sparkles, CheckCircle, Bell } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useMessageNotifications } from "@/hooks/useMessageNotifications";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useSubscriptionCheck } from "@/hooks/useSubscriptionCheck";
import UserConfessionsList from "@/components/UserConfessionsList";
import UserAnalytics from "@/components/UserAnalytics";
import BadgesDisplay from "@/components/BadgesDisplay";
import StreakCounter from "@/components/StreakCounter";
import WordCloudViz from "@/components/WordCloudViz";
import FollowStats from "@/components/FollowStats";
import StreakReminder from "@/components/StreakReminder";
import AchievementToast from "@/components/AchievementToast";
import { ReferralRewardNotification } from "@/components/ReferralRewardNotification";
import AdvancedAnalytics from "@/components/AdvancedAnalytics";
import ModerationPanel from "@/components/ModerationPanel";
import CoinsDisplay from "@/components/CoinsDisplay";

import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { InstagramBottomNav } from "@/components/InstagramBottomNav";
import { FlairsShop } from "@/components/FlairsShop";
import { FlairsShopButton } from "@/components/FlairsShopButton";
import { ManageSubscriptionDialog } from "@/components/ManageSubscriptionDialog";
import { useTrialExpiryCheck } from "@/hooks/useTrialExpiryCheck";
import { SyncSubscriptionButton } from "@/components/SyncSubscriptionButton";
import { VIPBadge } from "@/components/VIPBadge";

const NewConfessionDialog = lazy(() => import("@/components/NewConfessionDialog"));
const Profile = () => {
  const navigate = useNavigate();
  const {
    t
  } = useLanguage();
  const {
    user
  } = useCurrentUser();
  const {
    isPremium,
    subscriptionTier,
    isVIP,
    isOnTrial,
    trialEndDate,
    trialEligible,
    refetch
  } = usePremiumStatus(user?.id);
  const {
    checkSubscription
  } = useSubscriptionCheck(user?.id);
  useMessageNotifications({
    userId: user?.id
  });
  const [manageSubDialogOpen, setManageSubDialogOpen] = useState(false);
  const [isNewConfessionOpen, setIsNewConfessionOpen] = useState(false);
  const [flairsDialogOpen, setFlairsDialogOpen] = useState(false);
  const [profileData, setProfileData] = useState<{
    stripe_subscription_id: string | null;
  } | null>(null);
  const {
    isModerator
  } = useUserRole(user?.id);
  const {
    toast
  } = useToast();
  
  // Check for trial expiry and show notification
  useTrialExpiryCheck(user?.id || null, isOnTrial);

  const loadProfileData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const {
        data,
        error
      } = await supabase.from('profiles').select('stripe_subscription_id').eq('user_id', user.id).single();
      if (error) throw error;
      setProfileData(data);
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadProfileData();
    }
  }, [user?.id, loadProfileData]);

  const handleManageSubscription = async () => {
    const STRIPE_VIP_CHECKOUT_URL = "https://buy.stripe.com/test_9B600lewecBRavrfcG0Ba00";
    
    const openStripeCheckout = () => {
      try {
        if (window.top && window.top !== window) {
          window.top.location.href = STRIPE_VIP_CHECKOUT_URL;
        } else {
          const win = window.open(STRIPE_VIP_CHECKOUT_URL, '_blank', 'noopener');
          if (!win) window.location.href = STRIPE_VIP_CHECKOUT_URL;
        }
      } catch {
        window.location.href = STRIPE_VIP_CHECKOUT_URL;
      }
    };

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.error) {
        toast({
          title: "No Active Subscription",
          description: "Redirecting to checkout...",
        });
        openStripeCheckout();
        return;
      }
      
      if (data?.url) {
        try {
          if (window.top && window.top !== window) {
            window.top.location.href = data.url;
          } else {
            const win = window.open(data.url, '_blank', 'noopener');
            if (!win) window.location.href = data.url;
          }
        } catch {
          window.location.href = data.url;
        }
      }
    } catch (error) {
      console.error('Error opening portal:', error);
      toast({
        title: "Opening Checkout",
        description: "Redirecting to subscription page...",
      });
      openStripeCheckout();
    }
  };

  const checkAuth = useCallback(async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
    }
  }, [navigate]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Ensure profile reflects latest subscription from Stripe on profile load
  useEffect(() => {
    (async () => {
      await checkSubscription();
      await refetch();
    })();
  }, [checkSubscription, refetch]);

  if (!user) return null;
  return <AppLayout onNewConfession={() => setIsNewConfessionOpen(true)} onManageSubscription={() => setManageSubDialogOpen(true)}>
      <AchievementToast userId={user.id} />
      <ReferralRewardNotification userId={user.id} />
      
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 max-w-4xl pb-24">
        
        
        <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8 animate-fade-in">
          <div className="rounded-full">
            <User className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                <GradientText variant="hero">{t.profile_title}</GradientText>
              </h1>
              <VIPBadge tier={subscriptionTier as 'free' | 'vip'} size="lg" showLabel />
            </div>
            {/* Show active equipped flairs */}
            <div className="mt-2">
              <BadgesDisplay 
                userId={user.id} 
                variant="compact"
              />
            </div>
          </div>
        </div>

        <StreakReminder userId={user.id} />

        <Tabs defaultValue="statistics" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
          <TabsList className={`grid w-full ${isModerator ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'} h-auto`}>
            <TabsTrigger value="statistics" className="text-xs sm:text-sm py-2">{t.profile_statistics}</TabsTrigger>
            <TabsTrigger value="confessions" className="text-xs sm:text-sm py-2">{t.profile_my_confessions}</TabsTrigger>
            <TabsTrigger value="achievements" className="text-xs sm:text-sm py-2">{t.profile_achievements}</TabsTrigger>
            {isModerator && <TabsTrigger value="moderation" className="text-xs sm:text-sm py-2">{t.profile_moderation}</TabsTrigger>}
          </TabsList>

          <TabsContent value="statistics" className="space-y-6">
            {/* Sync Subscription Button (temporary fix for webhook issues) */}
            {profileData?.stripe_subscription_id && (
              <div className="flex justify-end mb-4">
                <SyncSubscriptionButton onSyncComplete={checkSubscription} />
              </div>
            )}
            
            <FollowStats userId={user.id} />

            {/* VIP Benefits Card */}
            {isVIP && (
              <AnimatedCard className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  VIP Benefits Active
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Unlimited daily confessions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Priority AI responses</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>No ads experience</span>
                  </div>
                </div>
              </AnimatedCard>
            )}
            
            <UserAnalytics
              onUpgradeClick={() => {}}
              onManageSubscription={() => setManageSubDialogOpen(true)}
            />
            
            <AdvancedAnalytics userId={user.id} />
            
            <WordCloudViz userId={user.id} />
          </TabsContent>

          <TabsContent value="confessions" className="space-y-6">
            <UserConfessionsList />
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">{t.badges_your_badges}</h2>
                  <FlairsShopButton 
                    onClick={() => setFlairsDialogOpen(true)} 
                    tier={subscriptionTier as "free" | "vip"}
                  />
              </div>
              <BadgesDisplay userId={user.id} variant="full" />
            </div>
          </TabsContent>


          {isModerator && <TabsContent value="moderation" className="space-y-6">
              <ModerationPanel userId={user.id} />
            </TabsContent>}
        </Tabs>
      </div>
      
      <InstagramBottomNav />

      <ManageSubscriptionDialog
        open={manageSubDialogOpen} 
        onOpenChange={setManageSubDialogOpen}
        onSubscriptionUpdated={checkSubscription}
      />

      <FlairsShop open={flairsDialogOpen} onOpenChange={setFlairsDialogOpen} userId={user.id} />

      <Suspense fallback={null}>
        <NewConfessionDialog open={isNewConfessionOpen} onOpenChange={setIsNewConfessionOpen} onConfessionCreated={() => {}} />
      </Suspense>
    </AppLayout>;
};
export default memo(Profile);