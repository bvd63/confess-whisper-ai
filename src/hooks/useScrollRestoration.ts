import { useEffect, useRef } from 'react';
import { persistenceManager } from '@/lib/persistenceManager';
import { useLocation } from 'react-router-dom';

/**
 * Hook for saving and restoring scroll position across sessions
 */
export const useScrollRestoration = (enabled: boolean = true) => {
  const location = useLocation();
  const scrollKey = `scroll_${location.pathname}`;
  const isRestoringRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Restore scroll position on mount
  useEffect(() => {
    if (!enabled) return;

    const restoreScroll = async () => {
      const position = await persistenceManager.getScrollPosition(location.pathname);
      if (position !== null && !isRestoringRef.current) {
        isRestoringRef.current = true;
        
        // Wait for content to load before scrolling
        setTimeout(() => {
          window.scrollTo(0, position);
          isRestoringRef.current = false;
        }, 100);
      }
    };

    restoreScroll();
  }, [location.pathname, enabled]);

  // Save scroll position on scroll (debounced)
  useEffect(() => {
    if (!enabled) return;

    const handleScroll = () => {
      if (isRestoringRef.current) return;

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounce save operation
      saveTimeoutRef.current = setTimeout(() => {
        persistenceManager.saveScrollPosition(location.pathname, window.scrollY);
      }, 500);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [location.pathname, enabled]);
};
