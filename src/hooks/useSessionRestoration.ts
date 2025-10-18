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
          // Navigate to last route with conversation ID if available
          if (sessionState.conversationId) {
            navigate(`${sessionState.route}?user=${sessionState.conversationId}`);
          } else if (sessionState.route !== window.location.pathname) {
            navigate(sessionState.route);
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
