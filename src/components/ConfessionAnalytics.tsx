import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRecharts } from '@/hooks/useRecharts';

interface ConfessionAnalyticsProps {
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

const CARTESIAN_AND_PIE_SCOPES = ['cartesianCore', 'bar', 'pie'] as const;

export const ConfessionAnalytics = ({ views, likes, comments, shares }: ConfessionAnalyticsProps) => {
  const { t } = useLanguage();
  const recharts = useRecharts(CARTESIAN_AND_PIE_SCOPES);

  const engagementData = [
    { name: t.views, value: views },
    { name: t.likes, value: likes },
    { name: t.comments, value: comments },
    { name: t.shares, value: shares },
  ];

  const bestTimesData = [
    { hour: '00-06', engagement: 12 },
    { hour: '06-12', engagement: 45 },
    { hour: '12-18', engagement: 78 },
    { hour: '18-24', engagement: 65 },
  ];

  if (!recharts) {
    return null;
  }

  const { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, CartesianGrid, XAxis, YAxis, Bar } = recharts;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t.analytics_engagement}</CardTitle>
          <CardDescription>{t.analytics_engagement_desc}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={engagementData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={80}
                fill="hsl(var(--primary))"
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

      <Card>
        <CardHeader>
          <CardTitle>{t.analytics_best_times}</CardTitle>
          <CardDescription>{t.analytics_best_times_desc}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bestTimesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="engagement" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
