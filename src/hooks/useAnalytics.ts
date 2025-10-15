import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AnalyticsEvent = 
  | 'page_view'
  | 'confession_created'
  | 'confession_create_clicked'
  | 'confession_liked'
  | 'confession_shared'
  | 'confession_reported'
  | 'deep_insight_generated'
  | 'premium_upgrade_clicked'
  | 'auth_signup'
  | 'auth_login'
  | 'referral_shared';

interface EventData {
  [key: string]: any;
}

export const useAnalytics = () => {
  const trackEvent = useCallback(async (eventType: AnalyticsEvent, eventData?: EventData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      await supabase.from('analytics_events').insert({
        user_id: user.id,
        event_type: eventType,
        event_data: eventData || {},
      });
    } catch (error) {
      // Silently fail - analytics shouldn't break the app
      console.error('Analytics error:', error);
    }
  }, []);

  return { trackEvent };
};