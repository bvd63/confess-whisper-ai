import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, Calendar, Heart, MessageSquare } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { logError } from "@/lib/logger";
import { buildConfessionColumns } from "@/integrations/supabase/columnSets";
interface AdvancedAnalyticsProps {
  userId: string;
}
const AdvancedAnalytics = ({
  userId
}: AdvancedAnalyticsProps) => {
  const {
    t,
    language
  } = useLanguage();
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [engagementData, setEngagementData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadAnalytics();
  }, [userId]);
  const loadAnalytics = async () => {
    try {
      // Get confessions
      const {
        data: confessions
      } = await supabase
        .from('confessions')
        .select(buildConfessionColumns(['category', 'likes_count', 'comments_count', 'created_at']))
        .eq('user_id', userId);
      if (!confessions) return;

      // Category distribution
      const categoryMap = new Map<string, number>();
      confessions.forEach(c => {
        categoryMap.set(c.category, (categoryMap.get(c.category) || 0) + 1);
      });
      const categoryChartData = Array.from(categoryMap.entries()).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value
      }));
      setCategoryData(categoryChartData);

      // Timeline (last 7 days)
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const count = confessions.filter(c => {
          const confDate = new Date(c.created_at).toISOString().split('T')[0];
          return confDate === dateStr;
        }).length;
        const locale = language === 'es' ? 'es-ES' : language === 'de' ? 'de-DE' : 'en-US';
        last7Days.push({
          date: date.toLocaleDateString(locale, {
            weekday: 'short'
          }),
          [t.analytics_confessions]: count
        });
      }
      setTimelineData(last7Days);

      // Engagement metrics
      const totalLikes = confessions.reduce((sum, c) => sum + (c.likes_count || 0), 0);
      const totalComments = confessions.reduce((sum, c) => sum + (c.comments_count || 0), 0);
      const avgLikes = confessions.length > 0 ? (totalLikes / confessions.length).toFixed(1) : 0;
      const avgComments = confessions.length > 0 ? (totalComments / confessions.length).toFixed(1) : 0;
      setEngagementData([{
        name: 'Likes',
        value: totalLikes,
        avg: avgLikes,
        icon: Heart,
        color: '#ef4444'
      }, {
        name: t.comments_title,
        value: totalComments,
        avg: avgComments,
        icon: MessageSquare,
        color: '#3b82f6'
      }]);
    } catch (error) {
      logError('Error loading analytics', error instanceof Error ? error : undefined);
    } finally {
      setLoading(false);
    }
  };
  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899'];
  if (loading) return null;
  return <div className="space-y-3 sm:space-y-4">
      {/* Engagement Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
        {engagementData.map(stat => <Card key={stat.name} className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h3 className="text-sm sm:text-base font-semibold">{stat.name}</h3>
              <stat.icon className="w-4 h-4 sm:w-5 sm:h-5" style={{
            color: stat.color
          }} />
            </div>
            <div className="space-y-1 sm:space-y-1.5">
              <div className="flex items-baseline gap-1.5 sm:gap-2">
                <p className="text-2xl sm:text-3xl font-bold" style={{
              color: stat.color
            }}>{stat.value}</p>
                <span className="text-xs sm:text-sm text-muted-foreground">total</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {t.analytics_average_per}: <span className="font-semibold">{stat.avg}</span>
              </p>
            </div>
          </Card>)}
      </div>

      {/* Timeline Chart */}
      <Card className="p-3 sm:p-4">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          <h3 className="text-sm sm:text-base font-semibold">{t.analytics_activity_7days}</h3>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={timelineData}>
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <Tooltip contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px'
          }} />
            <Line type="monotone" dataKey={t.analytics_confessions} stroke="hsl(var(--primary))" strokeWidth={2} dot={{
            fill: 'hsl(var(--primary))'
          }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Category Distribution */}
      {categoryData.length > 0}
    </div>;
};
export default AdvancedAnalytics;