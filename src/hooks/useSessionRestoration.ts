import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionManager } from '@/lib/sessionManager';
import { useCurrentUser } from './useCurrentUser';

/**
 * Hook to restore user's last session state on app load
 * Automatically navigates to last active route and conversation
 */
export const useSessionRestoration = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useCurrentUser();
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    if (isLoading) return;

    const restoreSession = async () => {
      try {
        if (!user) {
          setIsRestoring(false);
          return;
        }

        const sessionState = await sessionManager.restoreSession();
        
        if (sessionState) {
          // Do not auto-redirect into a conversation; only restore the last route root
          if (sessionState.route !== window.location.pathname || window.location.search) {
            const target = sessionState.route.startsWith('/messages') ? '/messages' : sessionState.route;
            navigate(target, { replace: true });
          }
        }
      } catch (error) {
        console.error('Error restoring session:', error);
      } finally {
        setIsRestoring(false);
      }
    };

    restoreSession();
  }, [user, isLoading, navigate]);

  return { isRestoring };
};
