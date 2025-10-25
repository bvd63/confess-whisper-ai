import { useState, useEffect, useCallback, Suspense, lazy, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EnhancedButton } from "@/components/EnhancedButton";
import { AnimatedCard } from "@/components/AnimatedCard";
import { GradientText } from "@/components/GradientText";
import { FloatingElement } from "@/components/FloatingElement";
import { User, Settings, Sparkles, CheckCircle, Bell } from "lucide-react";
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
import UserPreferences from "@/components/UserPreferences";
import WordCloudViz from "@/components/WordCloudViz";
import FollowStats from "@/components/FollowStats";
import { KarmaDisplay } from "@/components/KarmaDisplay";
import StreakReminder from "@/components/StreakReminder";
import AchievementToast from "@/components/AchievementToast";
import { ReferralRewardNotification } from "@/components/ReferralRewardNotification";
import AdvancedAnalytics from "@/components/AdvancedAnalytics";
import ExportDataDialog from "@/components/ExportDataDialog";
import ModerationPanel from "@/components/ModerationPanel";
import CoinsDisplay from "@/components/CoinsDisplay";
import BlockedUsers from "@/components/BlockedUsers";
import ReferralSystem from "@/components/ReferralSystem";

import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { NicknameSettings } from "@/components/NicknameSettings";
import { EmailDisplay } from "@/components/EmailDisplay";
import { PasswordChange } from "@/components/PasswordChange";
import { InstagramBottomNav } from "@/components/InstagramBottomNav";
import { ProfileEditor } from "@/components/ProfileEditor";
import { FlairsShop } from "@/components/FlairsShop";
import { FlairsShopButton } from "@/components/FlairsShopButton";
import { ManageSubscriptionDialog } from "@/components/ManageSubscriptionDialog";
import { useTrialExpiryCheck } from "@/hooks/useTrialExpiryCheck";
import { SyncSubscriptionButton } from "@/components/SyncSubscriptionButton";
import { VIPBadge } from "@/components/VIPBadge";

import { SubscriptionStatusCard } from "@/components/SubscriptionStatusCard";
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
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  
  const [manageSubDialogOpen, setManageSubDialogOpen] = useState(false);
  const [isNewConfessionOpen, setIsNewConfessionOpen] = useState(false);
  const [flairsDialogOpen, setFlairsDialogOpen] = useState(false);
  const [passwordChangedAt, setPasswordChangedAt] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<{
    nickname: string | null;
    bio: string | null;
    handle: string | null;
    privacy_mode: string | null;
    nickname_updated_at: string | null;
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
      } = await supabase.from('profiles').select('nickname, bio, handle, privacy_mode, nickname_updated_at, stripe_subscription_id').eq('user_id', user.id).single();
      if (error) throw error;
      setProfileData(data);
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  }, [user?.id]);

  const loadPasswordChangedAt = useCallback(async () => {
    if (!user?.id) return;
    try {
      const {
        data,
        error
      } = await supabase.from('profiles').select('password_changed_at').eq('user_id', user.id).single();
      if (error) throw error;
      setPasswordChangedAt(data?.password_changed_at || null);
    } catch (error) {
      console.error('Error loading password changed date:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadPasswordChangedAt();
      loadProfileData();
    }
  }, [user?.id, loadPasswordChangedAt, loadProfileData]);

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
          <TabsList className={`grid w-full ${isModerator ? 'grid-cols-3 sm:grid-cols-5' : 'grid-cols-3 sm:grid-cols-4'} h-auto`}>
            <TabsTrigger value="statistics" className="text-xs sm:text-sm py-2">{t.profile_statistics}</TabsTrigger>
            <TabsTrigger value="confessions" className="text-xs sm:text-sm py-2">{t.profile_my_confessions}</TabsTrigger>
            <TabsTrigger value="achievements" className="text-xs sm:text-sm py-2">{t.profile_achievements}</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm py-2">{t.profile_settings}</TabsTrigger>
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
            
            <KarmaDisplay userId={user.id} variant="full" />

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
                    <span>2x karma points</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Daily reflections</span>
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

          <TabsContent value="settings" className="space-y-6">
            {/* Subscription Status Card - Prominent display */}
            <SubscriptionStatusCard />
            
            {profileData && <ProfileEditor userId={user.id} currentProfile={profileData} onUpdate={loadProfileData} />}
            <EmailDisplay email={user.email || ''} />
            <PasswordChange userId={user.id} passwordChangedAt={passwordChangedAt} />
            <UserPreferences userId={user.id} />
            
            {/* Notification Settings Link */}
            <AnimatedCard hover="lift" glass className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Notification Settings
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Manage your reminders and alerts
                  </p>
                </div>
                <EnhancedButton
                  onClick={() => navigate('/settings/notifications')}
                  variant="outline"
                  size="sm"
                >
                  Configure
                </EnhancedButton>
              </div>
            </AnimatedCard>
            
            <ReferralSystem userId={user.id} />
            <BlockedUsers userId={user.id} />
            
            {/* Auth Testing Dashboard Link */}
            <AnimatedCard hover="lift" glass className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Security Testing
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Manage sessions and test authentication features
                  </p>
                </div>
                <EnhancedButton
                  onClick={() => navigate('/auth-test')}
                  variant="outline"
                  size="sm"
                >
                  Open Dashboard
                </EnhancedButton>
              </div>
            </AnimatedCard>
            
            <Button onClick={() => setExportDialogOpen(true)} variant="outline" className="w-full">
              {t.export_my_data}
            </Button>
          </TabsContent>

          {isModerator && <TabsContent value="moderation" className="space-y-6">
              <ModerationPanel userId={user.id} />
            </TabsContent>}
        </Tabs>
      </div>
      
      <InstagramBottomNav />

      <ExportDataDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} userId={user.id} />

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