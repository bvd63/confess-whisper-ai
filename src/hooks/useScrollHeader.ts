import { useState, useEffect, useRef } from 'react';

interface UseScrollHeaderOptions {
  threshold?: number;
  topOffset?: number;
  container?: HTMLElement | null;
}

export const useScrollHeader = (options: UseScrollHeaderOptions = {}) => {
  const { threshold = 10, topOffset = 30, container = null } = options;
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const target = container ?? window;
    const getScrollPosition = () => (container ? container.scrollTop : window.scrollY);

    // Initialize last known position from the current scroll container
    lastScrollY.current = getScrollPosition();

    const updateScrollDirection = () => {
      const scrollY = getScrollPosition();

      // Always show header near the top
      if (scrollY < topOffset) {
        setIsVisible(true);
        lastScrollY.current = scrollY;
        ticking.current = false;
        return;
      }

      const scrollDelta = scrollY - lastScrollY.current;

      // Scrolling down past the threshold hides the header; any upward move shows it immediately
      if (scrollDelta > threshold) {
        setIsVisible(false);
      } else if (scrollDelta < 0) {
        setIsVisible(true);
      }

      lastScrollY.current = scrollY;
      ticking.current = false;
    };

    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking.current = true;
      }
    };

    target.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      target.removeEventListener('scroll', handleScroll);
    };
  }, [threshold, topOffset, container]);

  return isVisible;
};
