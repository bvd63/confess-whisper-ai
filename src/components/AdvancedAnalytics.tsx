import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, Calendar, Heart, MessageSquare } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { logError } from "@/lib/logger";
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
      } = await supabase.from('confessions').select('*').eq('user_id', userId);
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
  return <div className="space-y-6">
      {/* Engagement Stats - Modern cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {engagementData.map(stat => <Card key={stat.name} className="p-5 sm:p-6 rounded-3xl shadow-card hover:shadow-elevated transition-all duration-300 border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-bold">{stat.name}</h3>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-ios" style={{
            backgroundColor: `${stat.color}15`
          }}>
                <stat.icon className="w-5 h-5" style={{
            color: stat.color
          }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <p className="text-3xl sm:text-4xl font-bold" style={{
              color: stat.color
            }}>{stat.value}</p>
                <span className="text-sm text-muted-foreground font-semibold">total</span>
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                {t.analytics_average_per}: <span className="font-bold text-foreground">{stat.avg}</span>
              </p>
            </div>
          </Card>)}
      </div>

      {/* Timeline Chart - Better spacing */}
      <Card className="p-5 sm:p-6 rounded-3xl shadow-card border-border/50">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shadow-ios">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-base sm:text-lg font-bold">{t.analytics_activity_7days}</h3>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={timelineData}>
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <Tooltip contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '16px',
            padding: '12px'
          }} />
            <Line type="monotone" dataKey={t.analytics_confessions} stroke="hsl(var(--primary))" strokeWidth={3} dot={{
            fill: 'hsl(var(--primary))',
            r: 5
          }} activeDot={{
            r: 7
          }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Category Distribution */}
      {categoryData.length > 0}
    </div>;
};
export default AdvancedAnalytics;