import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Crown, MessageSquare, Heart, Settings, FileText } from "lucide-react";
import { Button } from "./ui/button";
import { ProfileTierBadge } from "./ProfileTierBadge";
import { logError } from "@/lib/logger";
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
      logError("Error fetching user stats", error as Error);
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
  return <div className="space-y-6">
      {/* Subscription Card - Modern design */}
      <Card className="border-primary/20 shadow-card rounded-3xl overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-primary/5 to-primary/10 px-6 py-5 border-b border-primary/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shadow-ios">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-lg sm:text-xl font-bold">{t.subscription_title}</CardTitle>
            </div>
            <ProfileTierBadge tier={subscriptionTier as "free" | "vip"} />
          </div>
        </CardHeader>
      </Card>

      {/* Stats Grid - Premium cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {statCards.map(stat => <Card key={stat.title} className="rounded-3xl shadow-card hover:shadow-elevated transition-all duration-300 hover:scale-[1.02] border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 p-5 sm:p-6">
            <CardTitle className="text-sm font-bold text-muted-foreground">{stat.title}</CardTitle>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shadow-ios">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent className="p-5 sm:p-6 pt-0">
            <div className="text-3xl sm:text-4xl font-bold text-foreground">{stat.value}</div>
          </CardContent>
        </Card>)}
    </div>
    </div>;
};
export default UserAnalytics;