import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Crown, MessageSquare, Heart, Settings, FileText } from "lucide-react";
import { Button } from "./ui/button";
import { ProfileTierBadge } from "./ProfileTierBadge";
interface UserAnalyticsProps {
  userId?: string;
  onUpgradeClick?: () => void;
  onManageSubscription?: () => void;
}
const UserAnalytics = ({
  userId,
  onUpgradeClick,
  onManageSubscription
}: UserAnalyticsProps) => {
  const {
    t
  } = useLanguage();
  const {
    user
  } = useCurrentUser();
  const {
    subscriptionTier,
    isPremium
  } = usePremiumStatus(userId || user?.id);
  const [stats, setStats] = useState({
    totalConfessions: 0,
    totalLikes: 0,
    totalComments: 0
  });
  const targetUserId = userId || user?.id;
  useEffect(() => {
    if (targetUserId) {
      fetchUserStats();

      // Set up real-time subscription for confessions updates
      const channel = supabase.channel('user-stats-changes').on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'confessions',
        filter: `user_id=eq.${targetUserId}`
      }, () => {
        fetchUserStats();
      }).subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [targetUserId]);
  const handleManageSubscription = () => {
    if (!isPremium) {
      onUpgradeClick?.();
      return;
    }
    onManageSubscription?.();
  };
  const fetchUserStats = async () => {
    if (!targetUserId) return;
    try {
      // Get total confessions
      const {
        count: confessionsCount
      } = await supabase.from("confessions").select("*", {
        count: "exact",
        head: true
      }).eq("user_id", targetUserId);

      // Get total likes received
      const {
        data: confessions
      } = await supabase.from("confessions").select("likes_count").eq("user_id", targetUserId);
      const totalLikes = confessions?.reduce((sum, c) => sum + (c.likes_count || 0), 0) || 0;

      // Get total comments received
      const {
        data: confessionsData
      } = await supabase.from("confessions").select("comments_count").eq("user_id", targetUserId);
      const totalComments = confessionsData?.reduce((sum, c) => sum + (c.comments_count || 0), 0) || 0;
      setStats({
        totalConfessions: confessionsCount || 0,
        totalLikes,
        totalComments
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
    }
  };
  const statCards = [{
    title: t.profile_total_confessions,
    value: stats.totalConfessions,
    icon: FileText,
    color: "text-primary"
  }, {
    title: t.profile_total_likes,
    value: stats.totalLikes,
    icon: Heart,
    color: "text-red-500"
  }, {
    title: t.profile_total_comments,
    value: stats.totalComments,
    icon: MessageSquare,
    color: "text-blue-500"
  }];
  return <div className="space-y-4">
      {/* Subscription Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between px-[5px] mx-px my-0 py-0">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">{t.subscription_title}</CardTitle>
              <ProfileTierBadge tier={(subscriptionTier === 'premium' ? 'vip' : subscriptionTier) as "free" | "vip"} />
            </div>
            <Button variant={isPremium ? "outline" : "default"} size="sm" onClick={handleManageSubscription} className="gap-2">
              {isPremium ? <>
                  <Settings className="w-4 h-4" />
                  {t.subs_manage}
                </> : <>
                  <Crown className="w-4 h-4" />
                  {t.subs_upgrade}
                </>}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
      {statCards.map(stat => <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-3 w-3 sm:h-4 sm:w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>)}
    </div>
    </div>;
};
export default UserAnalytics;