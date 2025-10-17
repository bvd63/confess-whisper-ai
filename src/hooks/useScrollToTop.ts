import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

export const useScrollToTop = () => {
  const { pathname } = useLocation();
  const lastTapRef = useRef<number>(0);
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Restore scroll position when returning to a page
    const savedPosition = sessionStorage.getItem(`scroll-${pathname}`);
    if (savedPosition) {
      window.scrollTo(0, parseInt(savedPosition));
    }

    // Save scroll position when leaving
    const handleScroll = () => {
      sessionStorage.setItem(`scroll-${pathname}`, window.scrollY.toString());
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname]);

  const scrollToTop = useCallback((smooth = true) => {
    window.scrollTo({
      top: 0,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  const handleDoubleTap = useCallback((onRefresh?: () => void) => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      // Double tap detected
      scrollToTop();
      if (onRefresh) {
        onRefresh();
      }
    }

    lastTapRef.current = now;
  }, [scrollToTop]);

  return {
    scrollToTop,
    handleDoubleTap,
    scrollContainerRef,
  };
};