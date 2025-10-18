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

const NewConfessionDialog = lazy(() => import("@/components/NewConfessionDialog"));

const Profile = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useCurrentUser();
  const { isPremium, subscriptionTier, isVIP } = usePremiumStatus(user?.id);
  const { checkSubscription } = useSubscriptionCheck(user?.id);
  useMessageNotifications({ userId: user?.id });
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [premiumDialogOpen, setPremiumDialogOpen] = useState(false);
  const [isNewConfessionOpen, setIsNewConfessionOpen] = useState(false);
  const [flairsDialogOpen, setFlairsDialogOpen] = useState(false);
  const [passwordChangedAt, setPasswordChangedAt] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<{
    nickname: string | null;
    bio: string | null;
    handle: string | null;
    privacy_mode: string | null;
    nickname_updated_at: string | null;
  } | null>(null);
  const { isModerator } = useUserRole(user?.id);
  const { toast } = useToast();

  useEffect(() => {
    if (user?.id) {
      loadPasswordChangedAt();
      loadProfileData();
    }
  }, [user?.id]);

  const loadProfileData = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('nickname, bio, handle, privacy_mode, nickname_updated_at')
        .eq('user_id', user!.id)
        .single();

      if (error) throw error;
      setProfileData(data);
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  };

  const loadPasswordChangedAt = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('password_changed_at')
        .eq('user_id', user!.id)
        .single();

      if (error) throw error;
      setPasswordChangedAt(data?.password_changed_at || null);
    } catch (error) {
      console.error('Error loading password changed date:', error);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: t.profile_portal_error,
        description: t.profile_portal_error_desc,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
    }
  };

  if (!user) return null;

  return (
    <AppLayout 
      onNewConfession={() => setIsNewConfessionOpen(true)}
      onUpgradeClick={() => setPremiumDialogOpen(true)}
    >
      <AchievementToast userId={user.id} />
      <ReferralRewardNotification userId={user.id} />
      
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 max-w-4xl pb-24">
        <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8 animate-fade-in">
          <FloatingElement delay={0.5}>
            <User className="h-6 w-6 sm:h-8 sm:w-8 text-primary animate-pulse-glow" />
          </FloatingElement>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            <GradientText variant="hero">{t.profile_title}</GradientText>
          </h1>
        </div>

        <StreakReminder userId={user.id} />

        <Tabs defaultValue="statistics" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
          <TabsList className={`grid w-full ${isModerator ? 'grid-cols-3 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'} h-auto`}>
            <TabsTrigger value="statistics" className="text-xs sm:text-sm py-2">{t.profile_statistics}</TabsTrigger>
            <TabsTrigger value="confessions" className="text-xs sm:text-sm py-2">{t.profile_my_confessions}</TabsTrigger>
            <TabsTrigger value="achievements" className="text-xs sm:text-sm py-2">{t.profile_achievements}</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm py-2">{t.profile_settings}</TabsTrigger>
            {isModerator && <TabsTrigger value="moderation" className="text-xs sm:text-sm py-2">{t.profile_moderation}</TabsTrigger>}
          </TabsList>

          <TabsContent value="statistics" className="space-y-6">
            {/* Subscription Status Card */}
            <AnimatedCard hover="glow" glass gradient className="p-6 border-primary/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1">
                    {t.profile} {subscriptionTier === 'free' ? t.profile_plan_free : subscriptionTier === 'vip' ? t.profile_plan_vip : t.profile_plan_premium}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isPremium ? t.subscription_thanks : t.subscription_upgrade_more}
                  </p>
                </div>
                {isPremium ? (
                  <EnhancedButton onClick={handleManageSubscription} variant="outline" lift>
                    <Settings className="w-4 h-4 mr-2" />
                    {t.subscription_manage}
                  </EnhancedButton>
                ) : (
                  <EnhancedButton onClick={() => setPremiumDialogOpen(true)} glow shine>
                    {t.subscription_upgrade_premium}
                  </EnhancedButton>
                )}
              </div>
            </AnimatedCard>

            <StreakCounter userId={user.id} variant="full" />
            <CoinsDisplay userId={user.id} variant="full" />
            <FollowStats userId={user.id} />
            <UserAnalytics />
            <AdvancedAnalytics userId={user.id} />
            <WordCloudViz userId={user.id} />
          </TabsContent>

          <TabsContent value="confessions" className="space-y-6">
            <UserConfessionsList />
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">{t.badges_your_badges}</h2>
              <BadgesDisplay userId={user.id} variant="full" />
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            {profileData && (
              <ProfileEditor 
                userId={user.id} 
                currentProfile={profileData}
                onUpdate={loadProfileData}
              />
            )}
            <EmailDisplay email={user.email || ''} />
            <PasswordChange 
              userId={user.id} 
              passwordChangedAt={passwordChangedAt}
            />
            <UserPreferences userId={user.id} />
            <div className="pt-4">
              <Button 
                onClick={() => setFlairsDialogOpen(true)}
                variant="outline"
                className="w-full"
              >
                {t.flairs_shop}
              </Button>
            </div>
            <ReferralSystem userId={user.id} />
            <BlockedUsers userId={user.id} />
            
            <div className="pt-4">
              <Button 
                onClick={() => setExportDialogOpen(true)}
                variant="outline"
                className="w-full"
              >
                {t.export_my_data}
              </Button>
            </div>
          </TabsContent>

          {isModerator && (
            <TabsContent value="moderation" className="space-y-6">
              <ModerationPanel userId={user.id} />
            </TabsContent>
          )}
        </Tabs>
      </div>
      
      <InstagramBottomNav />

      <ExportDataDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        userId={user.id}
      />

      <PremiumDialog
        open={premiumDialogOpen}
        onOpenChange={setPremiumDialogOpen}
        onUpgrade={() => {}}
      />

      <FlairsShop
        open={flairsDialogOpen}
        onOpenChange={setFlairsDialogOpen}
        userId={user.id}
      />

      <Suspense fallback={null}>
        <NewConfessionDialog
          open={isNewConfessionOpen}
          onOpenChange={setIsNewConfessionOpen}
          onConfessionCreated={() => {}}
        />
      </Suspense>
    </AppLayout>
  );
};

export default Profile;
