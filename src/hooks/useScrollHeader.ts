import { useState, useEffect, useRef } from 'react';

interface UseScrollHeaderOptions {
  threshold?: number;
  topOffset?: number;
}

export const useScrollHeader = (options: UseScrollHeaderOptions = {}) => {
  const { threshold = 10, topOffset = 30 } = options;
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const updateScrollDirection = () => {
      const scrollY = window.scrollY;

      // Always show header near the top
      if (scrollY < topOffset) {
        setIsVisible(true);
        lastScrollY.current = scrollY;
        ticking.current = false;
        return;
      }

      // Check if scroll distance exceeds threshold
      const scrollDelta = scrollY - lastScrollY.current;
      
      if (Math.abs(scrollDelta) < threshold) {
        ticking.current = false;
        return;
      }

      // Scrolling down - hide header
      if (scrollDelta > 0) {
        setIsVisible(false);
      }
      // Scrolling up - show header
      else if (scrollDelta < 0) {
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

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [threshold, topOffset]);

  return isVisible;
};
