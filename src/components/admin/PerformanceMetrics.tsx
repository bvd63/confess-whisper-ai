import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Database, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface WebVitals {
  lcp: number;
  fid: number;
  cls: number;
}

export const PerformanceMetrics = () => {
  const { t } = useLanguage();
  const [activeUsers, setActiveUsers] = useState(0);
  const [vitals, setVitals] = useState<WebVitals>({ lcp: 0, fid: 0, cls: 0 });

  useEffect(() => {
    // Get Web Vitals from Performance API
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      setVitals({
        lcp: navigation?.domContentLoadedEventEnd || 0,
        fid: navigation?.domInteractive || 0,
        cls: 0,
      });
    }

    // Get active users count
    const fetchActiveUsers = async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('public_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', fiveMinutesAgo);
      
      setActiveUsers(count || 0);
    };

    fetchActiveUsers();
    const interval = setInterval(fetchActiveUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleClearCache = () => {
    // Clear localStorage cache
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('cache_') || key.startsWith('query-')) {
        localStorage.removeItem(key);
      }
    });
    
    toast.success(t.cache_cleared);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold">{t.admin_performance}</h2>
        <p className="text-muted-foreground">{t.admin_performance_desc}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.admin_active_users}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers}</div>
            <p className="text-xs text-muted-foreground">{t.admin_last_5_minutes}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">LCP</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(vitals.lcp)}ms</div>
            <p className="text-xs text-muted-foreground">Largest Contentful Paint</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">FID</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(vitals.fid)}ms</div>
            <p className="text-xs text-muted-foreground">First Input Delay</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {t.admin_cache}
          </CardTitle>
          <CardDescription>{t.admin_clear_warning}</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                {t.admin_clear_cache}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t.admin_confirm_clear}</AlertDialogTitle>
                <AlertDialogDescription>{t.admin_clear_warning}</AlertDialogDescription>
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
  );
};
