import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AnalyticsEvent = 
  | 'page_view'
  | 'confession_created'
  | 'confession_create_clicked'
  | 'confession_liked'
  | 'confession_shared'
  | 'confession_reported'
  | 'deep_insight_generated'
  | 'vip_upgrade_clicked'
  | 'auth_signup'
  | 'auth_login'
  | 'referral_shared'
  | 'performance_metric'
  | 'pull_to_refresh'
  | 'notification_sent'
  | 'notification_received'
  | 'notification_clicked'
  | 'notification_dismissed'
  | 'notification_read'
  | 'notification_group_expanded';

interface EventData {
  [key: string]: any;
}

export const useAnalytics = () => {
  const batchRef = useRef<Array<{ eventType: AnalyticsEvent; eventData?: EventData }>>([]);
  const timerRef = useRef<NodeJS.Timeout>();

  const flushBatch = useCallback(async () => {
    if (batchRef.current.length === 0) return;

    const batch = [...batchRef.current];
    batchRef.current = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const events = batch.map(({ eventType, eventData }) => ({
        user_id: user.id,
        event_type: eventType,
        event_data: eventData || {},
      }));

      await supabase.from('analytics_events').insert(events);
    } catch (error) {
      console.error('Analytics batch error:', error);
    }
  }, []);

  const trackEvent = useCallback(async (eventType: AnalyticsEvent, eventData?: EventData) => {
    batchRef.current.push({ eventType, eventData });

    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Flush after 2 seconds or when batch reaches 10 events
    if (batchRef.current.length >= 10) {
      flushBatch();
    } else {
      timerRef.current = setTimeout(flushBatch, 2000);
    }
  }, [flushBatch]);

  const trackPerformance = useCallback((metricName: string, value: number) => {
    trackEvent('performance_metric', {
      metric: metricName,
      value,
      timestamp: Date.now(),
    });
  }, [trackEvent]);

  return { trackEvent, trackPerformance };
};