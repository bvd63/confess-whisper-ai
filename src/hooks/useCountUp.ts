import { useEffect, useState } from 'react';
import { useIntersectionObserver } from './useIntersectionObserver';

interface CountUpOptions {
  start?: number;
  end: number;
  duration?: number;
  separator?: string;
}

export const useCountUp = ({ 
  start = 0, 
  end, 
  duration = 2000,
  separator = ','
}: CountUpOptions) => {
  const [count, setCount] = useState(start);
  const [hasAnimated, setHasAnimated] = useState(false);
  const { targetRef: elementRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.3
  });

  useEffect(() => {
    if (!isIntersecting || hasAnimated) return;

    setHasAnimated(true);
    
    const startTime = Date.now();
    const range = end - start;
    
    const easeOutQuad = (t: number): number => {
      return t * (2 - t);
    };

    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easedProgress = easeOutQuad(progress);
      const currentCount = Math.floor(start + range * easedProgress);
      
      setCount(currentCount);
      
      if (progress === 1) {
        clearInterval(timer);
        setCount(end);
      }
    }, 16); // ~60fps

    return () => clearInterval(timer);
  }, [isIntersecting, hasAnimated, start, end, duration]);

  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  };

  return {
    count,
    formattedCount: formatNumber(count),
    elementRef
  };
};
