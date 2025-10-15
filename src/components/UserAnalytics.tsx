import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/i18n/translations";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { MessageSquare, Heart, FileText } from "lucide-react";

interface UserAnalyticsProps {
  userId?: string;
}

const UserAnalytics = ({ userId }: UserAnalyticsProps) => {
  const { t } = useLanguage();
  const [stats, setStats] = useState({
    totalConfessions: 0,
    totalLikes: 0,
    totalComments: 0,
  });

  useEffect(() => {
    fetchUserStats();
  }, [userId]);

  const fetchUserStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = userId || user?.id;
      if (!targetUserId) return;

      // Get total confessions
      const { count: confessionsCount } = await supabase
        .from("confessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", targetUserId);

      // Get total likes received
      const { data: confessions } = await supabase
        .from("confessions")
        .select("likes_count")
        .eq("user_id", targetUserId);

      const totalLikes = confessions?.reduce((sum, c) => sum + (c.likes_count || 0), 0) || 0;

      // Get total comments received
      const { data: confessionsData } = await supabase
        .from("confessions")
        .select("comments_count")
        .eq("user_id", targetUserId);

      const totalComments = confessionsData?.reduce((sum, c) => sum + (c.comments_count || 0), 0) || 0;

      setStats({
        totalConfessions: confessionsCount || 0,
        totalLikes,
        totalComments,
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
    }
  };

  const statCards = [
    {
      title: t.profile_total_confessions,
      value: stats.totalConfessions,
      icon: FileText,
      color: "text-primary",
    },
    {
      title: t.profile_total_likes,
      value: stats.totalLikes,
      icon: Heart,
      color: "text-red-500",
    },
    {
      title: t.profile_total_comments,
      value: stats.totalComments,
      icon: MessageSquare,
      color: "text-blue-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default UserAnalytics;
