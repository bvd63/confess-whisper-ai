import { useEffect, useState } from "react";
import { Heart, MessageCircle, TrendingUp, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import AnalyticsCard from "./AnalyticsCard";
import { Card } from "@/components/ui/card";

interface UserAnalyticsProps {
  userId: string;
}

interface AnalyticsData {
  totalConfessions: number;
  totalLikes: number;
  mostPopularConfession: string;
  categoryBreakdown: { category: string; count: number }[];
}

const UserAnalytics = ({ userId }: UserAnalyticsProps) => {
  const { t } = useLanguage();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalConfessions: 0,
    totalLikes: 0,
    mostPopularConfession: "",
    categoryBreakdown: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [userId]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      // Get all user confessions
      const { data: confessions, error } = await supabase
        .from('confessions')
        .select('id, content, likes_count, category')
        .eq('user_id', userId);

      if (error) throw error;

      if (!confessions || confessions.length === 0) {
        setIsLoading(false);
        return;
      }

      // Calculate total likes
      const totalLikes = confessions.reduce((sum, c) => sum + (c.likes_count || 0), 0);

      // Find most popular confession
      const mostPopular = confessions.reduce((prev, current) => 
        (current.likes_count || 0) > (prev.likes_count || 0) ? current : prev
      );

      // Category breakdown
      const categoryMap = new Map<string, number>();
      confessions.forEach(c => {
        const count = categoryMap.get(c.category) || 0;
        categoryMap.set(c.category, count + 1);
      });

      const categoryBreakdown = Array.from(categoryMap.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      setAnalytics({
        totalConfessions: confessions.length,
        totalLikes,
        mostPopularConfession: mostPopular.content.substring(0, 50) + (mostPopular.content.length > 50 ? '...' : ''),
        categoryBreakdown,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    const categoryMap: Record<string, string> = {
      relationships: t.category_relationships,
      work: t.category_work,
      family: t.category_family,
      health: t.category_health,
      money: t.category_money,
      other: t.category_other,
    };
    return categoryMap[category] || t.category_other;
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-muted/30 rounded-lg" />
        <div className="h-32 bg-muted/30 rounded-lg" />
      </div>
    );
  }

  if (analytics.totalConfessions === 0) {
    return (
      <Card className="p-8 text-center bg-gradient-to-br from-card to-muted/30">
        <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">{t.analytics_no_data}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
        {t.analytics_title}
      </h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnalyticsCard
          title={t.analytics_total_confessions}
          value={analytics.totalConfessions}
          icon={MessageCircle}
        />
        <AnalyticsCard
          title={t.analytics_total_likes}
          value={analytics.totalLikes}
          icon={Heart}
        />
      </div>

      {/* Most Popular */}
      {analytics.mostPopularConfession && (
        <Card className="p-6 bg-gradient-to-br from-card to-muted/30 border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">{t.analytics_most_popular}</h3>
          </div>
          <p className="text-sm text-muted-foreground italic">
            "{analytics.mostPopularConfession}"
          </p>
        </Card>
      )}

      {/* Category Breakdown */}
      {analytics.categoryBreakdown.length > 0 && (
        <Card className="p-6 bg-gradient-to-br from-card to-muted/30 border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">{t.analytics_by_category}</h3>
          </div>
          <div className="space-y-3">
            {analytics.categoryBreakdown.map(({ category, count }) => (
              <div key={category} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {getCategoryLabel(category)}
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all"
                      style={{ width: `${(count / analytics.totalConfessions) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-foreground w-8 text-right">
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default UserAnalytics;