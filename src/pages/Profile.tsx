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
import { useVipStatus } from "@/hooks/usePremiumStatus";
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
    subscriptionTier,
    isVip,
    isOnTrial,
    trialEndDate,
    trialEligible,
    refetch
  } = useVipStatus(user?.id);
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
        {/* Header */}
        <div className="sticky top-0 z-10 -mx-4 mb-8 glass-strong border-b border-border">
          <div className="px-4 py-5">
            <h1 className="text-2xl font-bold text-center text-foreground">
              Profile & Settings
            </h1>
          </div>
        </div>

        {/* Username with VIP Badge */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <h2 className="text-2xl font-bold text-foreground">
            @{user.id.slice(0, 8)}
          </h2>
          {isVip && (
            <>
              <span className="text-2xl">👑</span>
              <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-bold">
                VIP
              </span>
            </>
          )}
        </div>

        {/* Settings Section */}
        <div className="space-y-4 mb-8">
          {/* Language Selector Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-card via-card to-card/95 border border-border/50">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-foreground">Settings</h3>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground-secondary">Language</span>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="h-9 px-4 rounded-xl font-semibold bg-primary text-white"
                >
                  EN
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-4 rounded-xl font-semibold"
                >
                  ES
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-4 rounded-xl font-semibold"
                >
                  DE
                </Button>
              </div>
            </div>
          </div>

          {/* AI Support Chat */}
          <div 
            className="p-6 rounded-3xl bg-gradient-to-br from-card via-card to-card/95 border border-border/50 hover:border-primary/30 transition-all cursor-pointer"
            onClick={() => navigate('/settings/support/ai')}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <span className="text-lg font-semibold text-foreground">AI Support Chat</span>
            </div>
          </div>

          {/* Contact Email */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-card via-card to-card/95 border border-border/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-foreground-muted" />
              </div>
              <div>
                <span className="text-lg font-semibold text-foreground block">AI Support Chat</span>
                <span className="text-sm text-foreground-secondary">confess.supp@gmail.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* For Free users - Show upgrade button */}
        {!isVip && (
          <div className="mt-8 flex justify-center">
            <Button
              onClick={() => setManageSubDialogOpen(true)}
              size="lg"
              className="h-14 px-8 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold"
            >
              <Crown className="w-5 h-5 mr-2" />
              Unlock VIP
            </Button>
          </div>
        )}
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