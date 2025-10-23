import { useState, useEffect, Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EnhancedButton } from "@/components/EnhancedButton";
import { AnimatedCard } from "@/components/AnimatedCard";
import { GradientText } from "@/components/GradientText";
import { FloatingElement } from "@/components/FloatingElement";
import { User, Settings } from "lucide-react";
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
import StreakReminder from "@/components/StreakReminder";
import AchievementToast from "@/components/AchievementToast";
import { ReferralRewardNotification } from "@/components/ReferralRewardNotification";
import AdvancedAnalytics from "@/components/AdvancedAnalytics";
import ExportDataDialog from "@/components/ExportDataDialog";
import ModerationPanel from "@/components/ModerationPanel";
import CoinsDisplay from "@/components/CoinsDisplay";
import BlockedUsers from "@/components/BlockedUsers";
import ReferralSystem from "@/components/ReferralSystem";
import PremiumDialog from "@/components/PremiumDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { NicknameSettings } from "@/components/NicknameSettings";
import { EmailDisplay } from "@/components/EmailDisplay";
import { PasswordChange } from "@/components/PasswordChange";
import { InstagramBottomNav } from "@/components/InstagramBottomNav";
import { ProfileEditor } from "@/components/ProfileEditor";
import { FlairsShop } from "@/components/FlairsShop";
import { FlairsShopButton } from "@/components/FlairsShopButton";
import { TrialBanner } from "@/components/TrialBanner";
import { TrialCTA } from "@/components/TrialCTA";
import { ManageSubscriptionDialog } from "@/components/ManageSubscriptionDialog";
import { useTrialExpiryCheck } from "@/hooks/useTrialExpiryCheck";
import { SyncSubscriptionButton } from "@/components/SyncSubscriptionButton";
import { FeatureGate } from "@/components/auth/FeatureGate";
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
  const [premiumDialogOpen, setPremiumDialogOpen] = useState(false);
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
  useEffect(() => {
    if (user?.id) {
      loadPasswordChangedAt();
      loadProfileData();
    }
  }, [user?.id]);
  const loadProfileData = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('profiles').select('nickname, bio, handle, privacy_mode, nickname_updated_at, stripe_subscription_id').eq('user_id', user!.id).single();
      if (error) throw error;
      setProfileData(data);
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  };
  const loadPasswordChangedAt = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('profiles').select('password_changed_at').eq('user_id', user!.id).single();
      if (error) throw error;
      setPasswordChangedAt(data?.password_changed_at || null);
    } catch (error) {
      console.error('Error loading password changed date:', error);
    }
  };
  const handleManageSubscription = async () => {
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.error) {
        toast({
          title: "Subscription Not Found",
          description: "You don't have an active subscription to manage. Please upgrade to premium first.",
          variant: "destructive"
        });
        return;
      }
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Unable to Open Portal",
        description: "Please make sure you have an active subscription. Contact support if this persists.",
        variant: "destructive"
      });
    }
  };
  useEffect(() => {
    checkAuth();
  }, []);
  const checkAuth = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
    }
  };
  // Ensure profile reflects latest subscription from Stripe on profile load
  useEffect(() => {
    (async () => {
      await checkSubscription();
      await refetch();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkSubscription, refetch]);
  if (!user) return null;
  return <AppLayout onNewConfession={() => setIsNewConfessionOpen(true)} onUpgradeClick={() => setPremiumDialogOpen(true)} onManageSubscription={() => setManageSubDialogOpen(true)}>
      <AchievementToast userId={user.id} />
      <ReferralRewardNotification userId={user.id} />
      
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 max-w-4xl pb-24">
        {isOnTrial && trialEndDate && <TrialBanner trialEndDate={trialEndDate} />}
        
        <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8 animate-fade-in">
          <div className="rounded-full">
            <User className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
              <GradientText variant="hero">{t.profile_title}</GradientText>
            </h1>
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
            {/* Trial CTA for free users who haven't used trial */}
            {subscriptionTier === 'free' && !isOnTrial && trialEligible && (
              <TrialCTA userId={user.id} onTrialStarted={checkSubscription} />
            )}
            
            {/* Sync Subscription Button (temporary fix for webhook issues) */}
            {profileData?.stripe_subscription_id && (
              <div className="flex justify-end mb-4">
                <SyncSubscriptionButton onSyncComplete={checkSubscription} />
              </div>
            )}
            
            <FollowStats userId={user.id} />
            
            <UserAnalytics 
              onUpgradeClick={() => setPremiumDialogOpen(true)}
              onManageSubscription={() => setManageSubDialogOpen(true)}
            />
            
            <FeatureGate minTier="vip" teaserPriceHint="$9.99/mo" className="mt-6">
              <AdvancedAnalytics userId={user.id} />
            </FeatureGate>
            
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
                  tier={subscriptionTier as "free" | "premium" | "vip"}
                />
              </div>
              <BadgesDisplay userId={user.id} variant="full" />
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            {profileData && <ProfileEditor userId={user.id} currentProfile={profileData} onUpdate={loadProfileData} />}
            <EmailDisplay email={user.email || ''} />
            <PasswordChange userId={user.id} passwordChangedAt={passwordChangedAt} />
            <UserPreferences userId={user.id} />
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
            
            <div className="pt-4">
              <Button onClick={() => setExportDialogOpen(true)} variant="outline" className="w-full">
                {t.export_my_data}
              </Button>
            </div>
          </TabsContent>

          {isModerator && <TabsContent value="moderation" className="space-y-6">
              <ModerationPanel userId={user.id} />
            </TabsContent>}
        </Tabs>
      </div>
      
      <InstagramBottomNav />

      <ExportDataDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} userId={user.id} />

      <PremiumDialog open={premiumDialogOpen} onOpenChange={setPremiumDialogOpen} onUpgrade={() => {}} />

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
export default Profile;