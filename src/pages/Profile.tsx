import { useState, useEffect, useCallback, Suspense, lazy, memo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { User, Settings, LogOut, FileText, Heart, MessageCircle } from 'lucide-react';
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useMessageNotifications } from "@/hooks/useMessageNotifications";
import { useVipStatus } from "@/hooks/usePremiumStatus";
import { useSubscriptionCheck } from "@/hooks/useSubscriptionCheck";
import UserConfessionsList from "@/components/UserConfessionsList";
import BadgesDisplay from "@/components/BadgesDisplay";
import AchievementToast from "@/components/AchievementToast";
import { ReferralRewardNotification } from "@/components/ReferralRewardNotification";
import ModerationPanel from "@/components/ModerationPanel";

import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { FlairsShop } from "@/components/FlairsShop";
import { UnifiedShopDialog } from "@/components/UnifiedShopDialog";
import { useTrialExpiryCheck } from "@/hooks/useTrialExpiryCheck";
import { logError } from "@/lib/logger";
import { LogoutConfirmationDialog } from "@/components/LogoutConfirmationDialog";
import { useFollowSystem } from "@/hooks/useFollowSystem";
import { Users, UserPlus } from "lucide-react";

type ProfileStats = {
  totalConfessions: number;
  totalReactions: number;
  totalComments: number;
};

const formatCount = (value: number): string => {
  const abs = Math.abs(value);
  const format = (divider: number, suffix: string) => {
    const raw = value / divider;
    const rounded = raw >= 10 ? Math.round(raw) : Math.round(raw * 10) / 10;
    const text = Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
    return text.replace(/\.0$/, "") + suffix;
  };

  if (abs >= 1_000_000_000) return format(1_000_000_000, "b");
  if (abs >= 1_000_000) return format(1_000_000, "m");
  if (abs >= 1_000) return format(1_000, "k");
  return value.toString();
};

const NewConfessionDialog = lazy(() => import("@/components/NewConfessionDialog"));
const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { user } = useCurrentUser();
  const { subscriptionTier, isVip, isOnTrial, trialEndDate, trialEligible, refetch } = useVipStatus(user?.id);
  const { checkSubscription } = useSubscriptionCheck(user?.id);
  useMessageNotifications({ userId: user?.id });
  const { stats: followStats } = useFollowSystem(user?.id || null, user?.id || null);
  const [manageSubDialogOpen, setManageSubDialogOpen] = useState(false);
  const [isNewConfessionOpen, setIsNewConfessionOpen] = useState(false);
  const [flairsDialogOpen, setFlairsDialogOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profileData, setProfileData] = useState<{ stripe_subscription_id: string | null; bio: string | null; nickname: string | null } | null>(null);
  const [stats, setStats] = useState<ProfileStats>({
    totalConfessions: 0,
    totalReactions: 0,
    totalComments: 0
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
        .select('stripe_subscription_id, bio, nickname')
        .or(`user_id.eq.${user.id},id.eq.${user.id}`)
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

      // Fetch total reactions added by the user
      const { count: reactionsCount } = await supabase
        .from('confession_reactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Fetch total comments posted by the user
      const { count: commentsCount } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setStats({
        totalConfessions: confessionsCount || 0,
        totalReactions: reactionsCount || 0,
        totalComments: commentsCount || 0
      });
    } catch (error) {
      logError('Error fetching user stats', error as Error);
    }
  }, [user?.id]);

  const adjustStat = useCallback((key: keyof ProfileStats, delta: number) => {
    setStats((prev) => {
      const nextValue = Math.max(0, (prev[key] ?? 0) + delta);
      return { ...prev, [key]: nextValue };
    });
  }, []);

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
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const newBio = (payload.new as { bio?: string | null; stripe_subscription_id?: string | null; nickname?: string | null })?.bio ?? null;
        const newSub = (payload.new as { bio?: string | null; stripe_subscription_id?: string | null; nickname?: string | null })?.stripe_subscription_id ?? null;
        const newNickname = (payload.new as { bio?: string | null; stripe_subscription_id?: string | null; nickname?: string | null })?.nickname ?? null;
        setProfileData((prev) => ({
          stripe_subscription_id: newSub ?? prev?.stripe_subscription_id ?? null,
          bio: newBio,
          nickname: newNickname ?? prev?.nickname ?? null,
        }));
      })
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
        table: 'confession_reactions',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') adjustStat('totalReactions', 1);
        if (payload.eventType === 'DELETE') adjustStat('totalReactions', -1);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') adjustStat('totalComments', 1);
        if (payload.eventType === 'DELETE') adjustStat('totalComments', -1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchUserStats, adjustStat]);

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

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      navigate('/');
      toast({
        title: t.success_logout,
        description: t.success_logout
      });
    } finally {
      setIsLoggingOut(false);
      setLogoutDialogOpen(false);
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

  // Listen for local bio updates dispatched from Settings/ProfileEditor to update instantly
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ bio?: string | null }>).detail;
      if (!detail) return;
      setProfileData((prev) => ({
        stripe_subscription_id: prev?.stripe_subscription_id ?? null,
        bio: detail.bio ?? null,
        nickname: prev?.nickname ?? null,
      }));
    };
    window.addEventListener('profile-bio-updated', handler as EventListener);
    return () => window.removeEventListener('profile-bio-updated', handler as EventListener);
  }, []);

  // Listen for local nickname updates to refresh header instantly
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ nickname?: string | null }>).detail;
      if (!detail) return;
      setProfileData((prev) => ({
        stripe_subscription_id: prev?.stripe_subscription_id ?? null,
        bio: prev?.bio ?? null,
        nickname: detail.nickname ?? null,
      }));
    };
    window.addEventListener('profile-nickname-updated', handler as EventListener);
    return () => window.removeEventListener('profile-nickname-updated', handler as EventListener);
  }, []);

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
              <p className="text-sm mt-2 max-w-xl line-clamp-1 text-white/70">
                @{profileData?.nickname?.trim() || t.nickname_placeholder}
              </p>
              {(profileData?.bio?.trim() || t.profile_bio_placeholder) && (
                <p className="text-sm mt-1 max-w-xl line-clamp-2 text-white/50">
                  {profileData?.bio?.trim() || t.profile_bio_placeholder}
                </p>
              )}
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
              onClick={() => setLogoutDialogOpen(true)} 
              variant="ghost" 
              size="sm" 
              className="h-10 px-4 hover:bg-white/10 rounded-xl text-white/70"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-5 gap-3 mb-8">
          <Card className="bg-white/[0.03] border-white/10 backdrop-blur-md p-4 text-center">
            <Users className="w-5 h-5 text-white/60 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white/95">{formatCount(followStats.followers)}</div>
            <div className="text-xs text-white/50 mt-1">Followers</div>
          </Card>
          
          <Card className="bg-white/[0.03] border-white/10 backdrop-blur-md p-4 text-center">
            <UserPlus className="w-5 h-5 text-white/60 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white/95">{formatCount(followStats.following)}</div>
            <div className="text-xs text-white/50 mt-1">Following</div>
          </Card>
          
          <Card className="bg-white/[0.03] border-white/10 backdrop-blur-md p-4 text-center">
            <FileText className="w-5 h-5 text-white/60 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white/95">{formatCount(stats.totalConfessions)}</div>
            <div className="text-xs text-white/50 mt-1">{t.profile_total_confessions || "Confessions"}</div>
          </Card>
          
          <Card className="bg-white/[0.03] border-white/10 backdrop-blur-md p-4 text-center">
            <Heart className="w-5 h-5 text-white/60 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white/95">{formatCount(stats.totalReactions)}</div>
            <div className="text-xs text-white/50 mt-1">{t.profile_total_likes || "Reactions"}</div>
          </Card>
          
          <Card className="bg-white/[0.03] border-white/10 backdrop-blur-md p-4 text-center">
            <MessageCircle className="w-5 h-5 text-white/60 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white/95">{formatCount(stats.totalComments)}</div>
            <div className="text-xs text-white/50 mt-1">{t.profile_total_comments || "Comments"}</div>
          </Card>
        </div>

        {/* My Confessions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white/90 mb-4">{t.profile_my_confessions}</h2>
          <UserConfessionsList />
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

      <LogoutConfirmationDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        onConfirm={handleLogoutConfirm}
        isLoading={isLoggingOut}
      />

      <Suspense fallback={null}>
        <NewConfessionDialog 
          open={isNewConfessionOpen} 
          onOpenChange={setIsNewConfessionOpen} 
          onConfessionCreated={() => adjustStat('totalConfessions', 1)} 
        />
      </Suspense>
    </AppLayout>
  );
};
export default memo(Profile);
