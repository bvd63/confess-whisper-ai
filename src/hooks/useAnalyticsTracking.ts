import { useEffect } from 'react';
import { useAnalytics } from './useAnalytics';
import { useLocation } from 'react-router-dom';

/**
 * Automatic analytics tracking for page views and key events
 */
export const useAnalyticsTracking = (userId: string | null) => {
  const { trackEvent } = useAnalytics();
  const location = useLocation();

  // Track page views
  useEffect(() => {
    if (!userId) return;
    
    trackEvent('page_view', {
      path: location.pathname,
      search: location.search,
    });
  }, [location.pathname, location.search, userId, trackEvent]);

  return { trackEvent };
};
