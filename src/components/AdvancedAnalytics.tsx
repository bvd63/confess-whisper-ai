import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, Calendar, Heart, MessageSquare } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface AdvancedAnalyticsProps {
  userId: string;
}

const AdvancedAnalytics = ({ userId }: AdvancedAnalyticsProps) => {
  const { t, language } = useLanguage();
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
      const { data: confessions } = await supabase
        .from('confessions')
        .select('*')
        .eq('user_id', userId);

      if (!confessions) return;

      // Category distribution
      const categoryMap = new Map<string, number>();
      confessions.forEach(c => {
        categoryMap.set(c.category, (categoryMap.get(c.category) || 0) + 1);
      });

      const categoryChartData = Array.from(categoryMap.entries()).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
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
        date: date.toLocaleDateString(locale, { weekday: 'short' }),
        [t.analytics_confessions]: count,
      });
      }
      setTimelineData(last7Days);

      // Engagement metrics
      const totalLikes = confessions.reduce((sum, c) => sum + (c.likes_count || 0), 0);
      const totalComments = confessions.reduce((sum, c) => sum + (c.comments_count || 0), 0);
      const avgLikes = confessions.length > 0 ? (totalLikes / confessions.length).toFixed(1) : 0;
      const avgComments = confessions.length > 0 ? (totalComments / confessions.length).toFixed(1) : 0;

      setEngagementData([
        { name: 'Likes', value: totalLikes, avg: avgLikes, icon: Heart, color: '#ef4444' },
        { name: t.comments_title, value: totalComments, avg: avgComments, icon: MessageSquare, color: '#3b82f6' },
      ]);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899'];

  if (loading) return null;

  return (
    <div className="space-y-6">
      {/* Engagement Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {engagementData.map((stat) => (
          <Card key={stat.name} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{stat.name}</h3>
              <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                <span className="text-sm text-muted-foreground">total</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t.analytics_average_per}: <span className="font-semibold">{stat.avg}</span>
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Timeline Chart */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">{t.analytics_activity_7days}</h3>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={timelineData}>
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Line 
              type="monotone" 
              dataKey={t.analytics_confessions}
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Category Distribution */}
      {categoryData.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">{t.analytics_category_distribution}</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="flex flex-col justify-center space-y-2">
              {categoryData.map((cat, index) => (
                <div key={cat.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm">{cat.name}</span>
                  </div>
                  <span className="text-sm font-semibold">{cat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdvancedAnalytics;
