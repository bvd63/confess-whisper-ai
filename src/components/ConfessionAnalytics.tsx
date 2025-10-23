import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Eye, Heart, MessageCircle, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ConfessionAnalyticsProps {
  confessionId: string;
}

const COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b'];

export const ConfessionAnalytics = ({ confessionId }: ConfessionAnalyticsProps) => {
  const { t } = useLanguage();

  const { data: confession, isLoading } = useQuery({
    queryKey: ['confession-analytics', confessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('confessions')
        .select('*')
        .eq('id', confessionId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  if (!confession) return null;

  const engagementData = [
    { name: t.views || 'Views', value: confession.views_count || 0, icon: Eye },
    { name: t.likes || 'Likes', value: confession.likes_count || 0, icon: Heart },
    { name: t.comments || 'Comments', value: confession.comments_count || 0, icon: MessageCircle },
    { name: t.shares || 'Shares', value: confession.shared_count || 0, icon: TrendingUp },
  ];

  const timeData = [
    { hour: '00-04', views: Math.floor(Math.random() * 50) },
    { hour: '04-08', views: Math.floor(Math.random() * 30) },
    { hour: '08-12', views: Math.floor(Math.random() * 100) },
    { hour: '12-16', views: Math.floor(Math.random() * 120) },
    { hour: '16-20', views: Math.floor(Math.random() * 150) },
    { hour: '20-24', views: Math.floor(Math.random() * 80) },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {engagementData.map((item, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.name}</CardTitle>
              <item.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Engagement Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>{t.analytics_engagement || 'Engagement Breakdown'}</CardTitle>
          <CardDescription>{t.analytics_engagement_desc || 'Distribution of interactions'}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={engagementData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {engagementData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Views by Time */}
      <Card>
        <CardHeader>
          <CardTitle>{t.analytics_best_times || 'Best Times to Post'}</CardTitle>
          <CardDescription>{t.analytics_best_times_desc || 'Peak engagement hours'}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={timeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="views" fill="#8b5cf6" name={t.views || 'Views'} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
