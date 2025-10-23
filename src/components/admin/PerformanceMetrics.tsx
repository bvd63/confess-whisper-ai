import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { Activity, Users, Database, Trash2, TrendingUp, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export const PerformanceMetrics = () => {
  const { t } = useLanguage();
  const { metrics } = usePerformanceMonitor();
  const [clearing, setClearing] = useState(false);

  // Fetch active users count
  const { data: activeUsers } = useQuery({
    queryKey: ['active-users'],
    queryFn: async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', fiveMinutesAgo);
      
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  const handleClearCache = async () => {
    setClearing(true);
    try {
      // Clear localStorage cache
      const cacheKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('cache_') || key.startsWith('query_')
      );
      cacheKeys.forEach(key => localStorage.removeItem(key));

      // Clear sessionStorage
      sessionStorage.clear();

      toast.success(t.cache_cleared || 'Cache cleared successfully');
    } catch (error) {
      toast.error(t.error_generic);
    } finally {
      setClearing(false);
    }
  };

  const getPerformanceColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'text-green-500';
    if (value <= thresholds.warning) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">{t.admin_performance || 'Performance Metrics'}</h2>
        <p className="text-muted-foreground">{t.admin_performance_desc || 'System health and monitoring'}</p>
      </div>

      {/* Web Vitals */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">LCP</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPerformanceColor(metrics.lcp || 0, { good: 2500, warning: 4000 })}`}>
              {metrics.lcp ? `${Math.round(metrics.lcp)}ms` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Largest Contentful Paint
            </p>
            <Badge variant={metrics.lcp && metrics.lcp < 2500 ? 'default' : 'destructive'} className="mt-2">
              {metrics.lcp && metrics.lcp < 2500 ? 'Good' : 'Needs Work'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">FID</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPerformanceColor(metrics.fid || 0, { good: 100, warning: 300 })}`}>
              {metrics.fid ? `${Math.round(metrics.fid)}ms` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              First Input Delay
            </p>
            <Badge variant={metrics.fid && metrics.fid < 100 ? 'default' : 'destructive'} className="mt-2">
              {metrics.fid && metrics.fid < 100 ? 'Good' : 'Needs Work'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CLS</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPerformanceColor(metrics.cls || 0, { good: 0.1, warning: 0.25 })}`}>
              {metrics.cls ? metrics.cls.toFixed(3) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Cumulative Layout Shift
            </p>
            <Badge variant={metrics.cls && metrics.cls < 0.1 ? 'default' : 'destructive'} className="mt-2">
              {metrics.cls && metrics.cls < 0.1 ? 'Good' : 'Needs Work'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Active Users & Cache */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.admin_active_users || 'Active Users'}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t.admin_last_5_minutes || 'Last 5 minutes'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.admin_cache || 'Cache Management'}</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full" disabled={clearing}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t.admin_clear_cache || 'Clear Cache'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t.admin_confirm_clear || 'Clear all cache?'}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t.admin_clear_warning || 'This will remove all cached data. Users may experience slower loading temporarily.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t.common_cancel}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearCache}>
                    {t.common_confirm}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
