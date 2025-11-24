import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';

type AnalyticsEvent = 
  | 'confession_posted'
  | 'ai_reply_shown'
  | 'dm_sent'
  | 'follow'
  | 'profile_view'
  | 'notification_deleted'
  | 'checkout_completed'
  | 'page_view'
  | 'search'
  | 'like'
  | 'comment'
  | 'share'
  | 'bookmark'
  | 'deep_insight_generated'
  | 'notification_sent'
  | 'notification_received'
  | 'notification_clicked'
  | 'notification_dismissed'
  | 'notification_read'
  | 'notification_group_expanded';

interface AnalyticsEventData {
  [key: string]: any;
}

class Analytics {
  private queue: Array<{ event: AnalyticsEvent; data: AnalyticsEventData }> = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds

  constructor() {
    this.startFlushInterval();
  }

  private startFlushInterval() {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL);
  }

  track(event: AnalyticsEvent, data: AnalyticsEventData = {}) {
    // Add to queue
    this.queue.push({
      event,
      data: {
        ...data,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        referrer: document.referrer,
      },
    });

    // Flush if batch size reached
    if (this.queue.length >= this.BATCH_SIZE) {
      this.flush();
    }
  }

  private async flush() {
    if (this.queue.length === 0) return;

    const batch = [...this.queue];
    this.queue = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const events = batch.map(({ event, data }) => ({
        user_id: user.id,
        event_type: event,
        event_data: data || {},
      }));

      await supabase.from('analytics_events').insert(events);
    } catch (error) {
      logError('Analytics flush error', error as Error);
      // Re-queue failed events (up to limit)
      if (this.queue.length < 100) {
        this.queue.unshift(...batch.slice(0, 50));
      }
    }
  }

  async identify(userId: string, traits: Record<string, any> = {}) {
    this.track('page_view', {
      user_id: userId,
      ...traits,
    });
  }

  cleanup() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }
}

export const analytics = new Analytics();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    analytics.cleanup();
  });
}