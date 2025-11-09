import { useState } from 'react';
import { ArrowLeft, TrendingUp, MousePointer, Eye, Trash2, Clock, BarChart3, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { useNotificationAnalytics } from '@/hooks/useNotificationAnalytics';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import AppLayout from '@/components/AppLayout';

const NotificationAnalytics = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('7d');

  const getDateRange = () => {
    const end = new Date();
    const start = new Date();
    
    switch (dateRange) {
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
    }
    
    return { start, end };
  };

  const { start, end } = getDateRange();
  const { metrics, timeSeriesData, typeBreakdown, peakTimes, loading, error, refetch } = 
    useNotificationAnalytics(start, end);

  const chartConfig = {
    sent: {
      label: "Sent",
      color: "hsl(var(--chart-1))",
    },
    clicked: {
      label: "Clicked",
      color: "hsl(var(--chart-2))",
    },
    read: {
      label: "Read",
      color: "hsl(var(--chart-3))",
    },
  } satisfies ChartConfig;

  const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  const exportData = () => {
    const csv = [
      ['Metric', 'Value'],
      ['Total Sent', metrics.totalSent],
      ['Total Clicked', metrics.totalClicked],
      ['Total Read', metrics.totalRead],
      ['Click-Through Rate', `${metrics.clickThroughRate}%`],
      ['Read Rate', `${metrics.readRate}%`],
      ['Avg Response Time', `${metrics.avgResponseTime} min`],
      [''],
      ['Date', 'Sent', 'Clicked', 'Read'],
      ...timeSeriesData.map(d => [d.date, d.sent, d.clicked, d.read]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notification-analytics-${dateRange}.csv`;
    a.click();
  };

  return (
    <AppLayout>
      <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/notifications')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Notification Analytics</h1>
              <p className="text-sm text-muted-foreground">
                Track engagement and performance metrics
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={exportData}
              disabled={loading || timeSeriesData.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-chart-1" />
                Total Sent
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{metrics.totalSent}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MousePointer className="w-4 h-4 text-chart-2" />
                Total Clicked
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{metrics.totalClicked}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-chart-3" />
                CTR
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{metrics.clickThroughRate}%</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-chart-4" />
                Avg Response
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">{metrics.avgResponseTime}m</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Time Series Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications Over Time</CardTitle>
            <CardDescription>Daily notification activity</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : timeSeriesData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available for this time period
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line type="monotone" dataKey="sent" stroke="var(--color-sent)" strokeWidth={2} />
                    <Line type="monotone" dataKey="clicked" stroke="var(--color-clicked)" strokeWidth={2} />
                    <Line type="monotone" dataKey="read" stroke="var(--color-read)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Type Breakdown and Peak Times */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Type Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Notifications by Type</CardTitle>
              <CardDescription>Breakdown of notification categories</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : typeBreakdown.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              ) : (
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={typeBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Bar dataKey="count" fill="var(--color-sent)" name="Sent" />
                      <Bar dataKey="clicked" fill="var(--color-clicked)" name="Clicked" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Peak Times Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle>Peak Notification Times</CardTitle>
              <CardDescription>Hourly distribution of notifications</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : peakTimes.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              ) : (
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={peakTimes}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="hour" 
                        tickFormatter={(hour) => `${hour}:00`}
                      />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="var(--color-sent)" name="Notifications" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Engagement Rate Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Engagement Trends</CardTitle>
            <CardDescription>Read and click rates over time</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : timeSeriesData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Area type="monotone" dataKey="read" stackId="1" stroke="var(--color-read)" fill="var(--color-read)" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="clicked" stackId="1" stroke="var(--color-clicked)" fill="var(--color-clicked)" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default NotificationAnalytics;
