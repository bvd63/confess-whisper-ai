import { useState, useEffect, useCallback, Suspense, lazy, memo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { User, Settings, LogOut, FileText, MessageCircle, Sparkles } from 'lucide-react';
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
  const location = useLocation();
  const { t } = useLanguage();
  const { user } = useCurrentUser();
  const { subscriptionTier, isVip, isOnTrial, trialEndDate, trialEligible, refetch } = useVipStatus(user?.id);
  const { checkSubscription } = useSubscriptionCheck(user?.id);
  useMessageNotifications({ userId: user?.id });
  const [manageSubDialogOpen, setManageSubDialogOpen] = useState(false);
  const [isNewConfessionOpen, setIsNewConfessionOpen] = useState(false);
  const [flairsDialogOpen, setFlairsDialogOpen] = useState(false);
  const [profileData, setProfileData] = useState<{ stripe_subscription_id: string | null } | null>(null);
  const [stats, setStats] = useState({
    totalConfessions: 0,
    totalReactions: 0,
    totalHighlights: 0
  });
  const { isModerator } = useUserRole(user?.id);
  const { toast } = useToast();
  
  // Check for trial expiry and show notification
  useTrialExpiryCheck(user?.id || null, isOnTrial);

  const loadProfileData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('stripe_subscription_id')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      setProfileData(data);
    } catch (error) {
      if (import.meta.env.DEV) {
        logError('Error loading profile data', error as Error);
      }
    }
  }, [user?.id]);

  const fetchUserStats = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // Fetch total confessions
      const { count: confessionsCount } = await supabase
        .from('confessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Fetch total reactions received on user's confessions
      const { data: reactionsData } = await supabase
        .from('confession_reactions')
        .select('confession_id')
        .in('confession_id', 
          supabase.from('confessions').select('id').eq('user_id', user.id)
        );

      // Fetch total highlights (comments with highlight status)
      const { count: highlightsCount } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_highlighted', true);

      setStats({
        totalConfessions: confessionsCount || 0,
        totalReactions: reactionsData?.length || 0,
        totalHighlights: highlightsCount || 0
      });
    } catch (error) {
      logError('Error fetching user stats', error as Error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadProfileData();
      fetchUserStats();
    }
  }, [user?.id, loadProfileData, fetchUserStats]);

  // Set up real-time updates for stats
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('profile-stats-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'confessions',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchUserStats();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchUserStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchUserStats]);

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

  return (
    <AppLayout onNewConfession={() => setIsNewConfessionOpen(true)} onManageSubscription={() => setManageSubDialogOpen(true)}>
      <AchievementToast userId={user.id} />
      <ReferralRewardNotification userId={user.id} />
      
      <div className="container mx-auto px-4 py-6 max-w-2xl pb-24">
        {/* Profile Header */}
        <div className="flex items-start justify-between mb-6 animate-fade-in">
          <div className="flex items-center gap-4">
            {/* Avatar - NO VIP crown or badge */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/70 via-primary/60 to-accent/70 flex items-center justify-center shadow-lg flex-shrink-0">
              <User className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white/95">{t.profile_title}</h1>
              <BadgesDisplay userId={user.id} variant="compact" />
            </div>
          </div>
          
          {/* Settings & Logout */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 hover:bg-white/10 rounded-xl"
              onClick={() => navigate('/settings/activity')}
            >
              <Settings className="h-5 w-5 text-white/70" />
            </Button>
            <Button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate('/');
                toast({
                  title: t.success_logout,
                  description: t.success_logout
                });
              }} 
              variant="ghost" 
              size="sm" 
              className="h-10 px-4 hover:bg-white/10 rounded-xl text-white/70"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <Card className="bg-white/[0.03] border-white/10 backdrop-blur-md p-4 text-center">
            <FileText className="w-5 h-5 text-white/60 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white/95">{stats.totalConfessions}</div>
            <div className="text-xs text-white/50 mt-1">{t.profile_confessions || 'Confessions'}</div>
          </Card>
          
          <Card className="bg-white/[0.03] border-white/10 backdrop-blur-md p-4 text-center">
            <MessageCircle className="w-5 h-5 text-white/60 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white/95">{stats.totalReactions}</div>
            <div className="text-xs text-white/50 mt-1">{t.profile_reactions || 'Reactions'}</div>
          </Card>
          
          <Card className="bg-white/[0.03] border-white/10 backdrop-blur-md p-4 text-center">
            <Sparkles className="w-5 h-5 text-white/60 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white/95">{stats.totalHighlights}</div>
            <div className="text-xs text-white/50 mt-1">{t.profile_highlights || 'Highlights'}</div>
          </Card>
        </div>

        {/* My Confessions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white/90 mb-4">{t.profile_my_confessions}</h2>
          <UserConfessionsList />
        </div>

        {/* Detailed Statistics */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-white/90">{t.profile_statistics}</h2>
          
          <FollowStats userId={user.id} />
          
          <UserAnalytics
            onUpgradeClick={() => {}}
            onManageSubscription={() => setManageSubDialogOpen(true)}
          />
          
          <AdvancedAnalytics userId={user.id} />
          
          <WordCloudViz userId={user.id} />
        </div>

        {/* Moderation Panel (if moderator) */}
        {isModerator && (
          <div className="mt-8 space-y-6">
            <h2 className="text-lg font-semibold text-white/90">{t.profile_moderation}</h2>
            <ModerationPanel userId={user.id} />
          </div>
        )}
      </div>

      <UnifiedShopDialog
        open={manageSubDialogOpen} 
        onOpenChange={setManageSubDialogOpen}
        onSubscriptionUpdated={checkSubscription}
      />

      <FlairsShop open={flairsDialogOpen} onOpenChange={setFlairsDialogOpen} userId={user.id} />

      <Suspense fallback={null}>
        <NewConfessionDialog open={isNewConfessionOpen} onOpenChange={setIsNewConfessionOpen} onConfessionCreated={() => {}} />
      </Suspense>
    </AppLayout>
  );
};
export default memo(Profile);