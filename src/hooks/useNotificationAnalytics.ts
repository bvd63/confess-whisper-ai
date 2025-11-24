import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';

export interface NotificationMetrics {
  totalSent: number;
  totalClicked: number;
  totalRead: number;
  totalDismissed: number;
  clickThroughRate: number;
  readRate: number;
  avgResponseTime: number;
}

export interface TimeSeriesData {
  date: string;
  sent: number;
  clicked: number;
  read: number;
}

export interface NotificationTypeBreakdown {
  type: string;
  count: number;
  clicked: number;
  ctr: number;
}

export interface PeakTimeData {
  hour: number;
  count: number;
}

export const useNotificationAnalytics = (startDate: Date, endDate: Date) => {
  const [metrics, setMetrics] = useState<NotificationMetrics>({
    totalSent: 0,
    totalClicked: 0,
    totalRead: 0,
    totalDismissed: 0,
    clickThroughRate: 0,
    readRate: 0,
    avgResponseTime: 0,
  });
  
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [typeBreakdown, setTypeBreakdown] = useState<NotificationTypeBreakdown[]>([]);
  const [peakTimes, setPeakTimes] = useState<PeakTimeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [startDate, endDate]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all notification events in date range
      const { data: events, error: eventsError } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('user_id', user.id)
        .in('event_type', [
          'notification_sent',
          'notification_clicked',
          'notification_read',
          'notification_dismissed',
        ])
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (eventsError) throw eventsError;

      // Calculate metrics
      const sentEvents = events?.filter(e => e.event_type === 'notification_sent') || [];
      const clickedEvents = events?.filter(e => e.event_type === 'notification_clicked') || [];
      const readEvents = events?.filter(e => e.event_type === 'notification_read') || [];
      const dismissedEvents = events?.filter(e => e.event_type === 'notification_dismissed') || [];

      const totalSent = sentEvents.length;
      const totalClicked = clickedEvents.length;
      const totalRead = readEvents.length;
      const totalDismissed = dismissedEvents.length;

      const ctr = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;
      const readRate = totalSent > 0 ? (totalRead / totalSent) * 100 : 0;

      // Calculate average response time (time from sent to clicked)
      let totalResponseTime = 0;
      let responseCount = 0;
      
      clickedEvents.forEach(clicked => {
        const clickedData = clicked.event_data as any;
        const notificationId = clickedData?.notificationId;
        if (notificationId) {
          const sentEvent = sentEvents.find(
            s => {
              const sentData = s.event_data as any;
              return sentData?.notificationId === notificationId;
            }
          );
          if (sentEvent) {
            const diff = new Date(clicked.created_at).getTime() - 
                        new Date(sentEvent.created_at).getTime();
            totalResponseTime += diff;
            responseCount++;
          }
        }
      });

      const avgResponseTime = responseCount > 0 
        ? totalResponseTime / responseCount / 1000 / 60 // Convert to minutes
        : 0;

      setMetrics({
        totalSent,
        totalClicked,
        totalRead,
        totalDismissed,
        clickThroughRate: Number(ctr.toFixed(2)),
        readRate: Number(readRate.toFixed(2)),
        avgResponseTime: Number(avgResponseTime.toFixed(2)),
      });

      // Generate time series data (daily aggregation)
      const timeSeriesMap = new Map<string, { sent: number; clicked: number; read: number }>();
      
      events?.forEach(event => {
        const date = new Date(event.created_at).toISOString().split('T')[0];
        const existing = timeSeriesMap.get(date) || { sent: 0, clicked: 0, read: 0 };
        
        if (event.event_type === 'notification_sent') existing.sent++;
        else if (event.event_type === 'notification_clicked') existing.clicked++;
        else if (event.event_type === 'notification_read') existing.read++;
        
        timeSeriesMap.set(date, existing);
      });

      const timeSeries = Array.from(timeSeriesMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setTimeSeriesData(timeSeries);

      // Generate type breakdown
      const typeMap = new Map<string, { sent: number; clicked: number }>();
      
      events?.forEach(event => {
        const eventData = event.event_data as any;
        const type = eventData?.notification_type || 'unknown';
        const existing = typeMap.get(type) || { sent: 0, clicked: 0 };
        
        if (event.event_type === 'notification_sent') existing.sent++;
        else if (event.event_type === 'notification_clicked') existing.clicked++;
        
        typeMap.set(type, existing);
      });

      const breakdown = Array.from(typeMap.entries())
        .map(([type, data]) => ({
          type,
          count: data.sent,
          clicked: data.clicked,
          ctr: data.sent > 0 ? Number(((data.clicked / data.sent) * 100).toFixed(2)) : 0,
        }))
        .sort((a, b) => b.count - a.count);

      setTypeBreakdown(breakdown);

      // Generate peak times (hourly distribution)
      const hourMap = new Map<number, number>();
      
      sentEvents.forEach(event => {
        const hour = new Date(event.created_at).getHours();
        hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
      });

      const peakData = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        count: hourMap.get(hour) || 0,
      }));

      setPeakTimes(peakData);

    } catch (err) {
      logError('Error fetching notification analytics', err as Error);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  return {
    metrics,
    timeSeriesData,
    typeBreakdown,
    peakTimes,
    loading,
    error,
    refetch: fetchAnalytics,
  };
};
