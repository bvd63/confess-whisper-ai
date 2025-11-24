import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { analytics } from '@/lib/analytics';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export const AnalyticsProvider = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { user } = useCurrentUser();

  useEffect(() => {
    if (user) {
      analytics.identify(user.id, {
        email: user.email,
      });
    }
  }, [user]);

  useEffect(() => {
    analytics.track('page_view', {
      path: location.pathname,
      search: location.search,
    });
  }, [location.pathname, location.search]);

  return <>{children}</>;
};