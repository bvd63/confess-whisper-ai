import { useState, useEffect, useCallback, Suspense, lazy, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EnhancedButton } from "@/components/EnhancedButton";
import { AnimatedCard } from "@/components/AnimatedCard";
import { GradientText } from "@/components/GradientText";
import { FloatingElement } from "@/components/FloatingElement";
import { User, ArrowLeft, Settings, Plus, Crown, MessageCircle, Trophy, LogOut, RefreshCw } from 'lucide-react';
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
import { UnifiedShopDialog } from "@/components/UnifiedShopDialog";
import { useTrialExpiryCheck } from "@/hooks/useTrialExpiryCheck";
import { SyncSubscriptionButton } from "@/components/SyncSubscriptionButton";
import { VIPBadge } from "@/components/VIPBadge";
import { logError } from "@/lib/logger";

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
    isVip,
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
      if (import.meta.env.DEV) {
        logError('Error loading profile data', error as Error);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadProfileData();
    }
  }, [user?.id, loadProfileData]);

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.error) {
        toast({
          title: "No Active Subscription",
          description: "Please upgrade to VIP first.",
        });
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
      toast({
        title: "Error",
        description: "Failed to open subscription management",
      });
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
      
      <div className="container mx-auto px-4 py-6 max-w-4xl pb-24">
        <div className="flex items-center gap-3 mb-8 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-pressed flex items-center justify-center shadow-lg shadow-primary/25">
            <User className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">
                {t.profile_title}
              </h1>
              <VIPBadge tier={subscriptionTier as 'free' | 'vip'} size="lg" showLabel />
            </div>
            <div className="mt-3">
              <BadgesDisplay 
                userId={user.id} 
                variant="compact"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-12 w-12 p-0 hover:bg-muted rounded-2xl"
              aria-label={t.settings}
              title={t.settings}
              onClick={() => navigate('/settings/activity')}
            >
              <Settings className="h-5 w-5 text-foreground-muted hover:text-foreground transition-colors" />
            </Button>
            {profileData?.stripe_subscription_id && (
              <Button
                onClick={async () => {
                  const { data, error } = await supabase.functions.invoke('fix-subscription-sync');
                  if (error) throw error;
                  if (data?.success) {
                    toast({
                      title: "Subscription Synced",
                      description: data.message
                    });
                    setTimeout(() => window.location.reload(), 1500);
                  }
                }}
                variant="ghost"
                size="sm"
                className="h-12 w-12 p-0 hover:bg-muted rounded-2xl"
                aria-label="Sync Subscription"
                title="Sync Subscription"
              >
                <RefreshCw className="h-5 w-5 text-foreground-muted hover:text-foreground transition-colors" />
              </Button>
            )}
            <Button 
              onClick={async () => {
                await supabase.auth.signOut();
                navigate('/');
                toast({
                  title: t.success_logout,
                  description: t.success_logout
                });
              }} 
              variant="outline" 
              size="sm" 
              className="border-border bg-card hover:bg-muted h-12 px-5 rounded-2xl font-medium"
            >
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline text-sm">{t.logout}</span>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="statistics" className="space-y-8 mt-8">
          <TabsList className={`grid w-full ${isModerator ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'} h-14 rounded-2xl bg-muted p-1.5 gap-1.5`}>
            <TabsTrigger value="statistics" className="text-sm font-medium rounded-xl h-full data-[state=active]:bg-card data-[state=active]:shadow-lg">{t.profile_statistics}</TabsTrigger>
            <TabsTrigger value="confessions" className="text-sm font-medium rounded-xl h-full data-[state=active]:bg-card data-[state=active]:shadow-lg">{t.profile_my_confessions}</TabsTrigger>
            {isModerator && <TabsTrigger value="moderation" className="text-sm font-medium rounded-xl h-full data-[state=active]:bg-card data-[state=active]:shadow-lg">{t.profile_moderation}</TabsTrigger>}
          </TabsList>

          <TabsContent value="statistics" className="space-y-6">
            <FollowStats userId={user.id} />
            <UserAnalytics
              onUpgradeClick={() => {}}
              onManageSubscription={() => setManageSubDialogOpen(true)}
            />
            
            <AdvancedAnalytics userId={user.id} />
            
            <WordCloudViz userId={user.id} />
            
            {/* Link to Rewards Hub */}
            <div className="flex justify-center pt-4">
              <Button 
                onClick={() => navigate('/rewards?tab=achievements')}
                variant="outline"
                className="gap-2"
              >
                <Trophy className="w-4 h-4" />
                View All Achievements
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="confessions" className="space-y-6">
            <UserConfessionsList />
          </TabsContent>

          {/* Achievements tab removed - now in Rewards Hub */}


          {isModerator && <TabsContent value="moderation" className="space-y-6">
              <ModerationPanel userId={user.id} />
            </TabsContent>}
        </Tabs>
      </div>
      
      <InstagramBottomNav />

      <UnifiedShopDialog
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