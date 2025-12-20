import { useEffect, useRef, useState } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
}

export const usePullToRefresh = ({
  onRefresh,
  threshold = 80,
  disabled = false,
}: UsePullToRefreshOptions) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const hasActivePull = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disabled || !containerRef.current) return;

    const container = containerRef.current;
    let touchStartY = 0;

    const atTop = () => container.scrollTop <= 2;

    const handleTouchStart = (e: TouchEvent) => {
      if (!atTop()) {
        hasActivePull.current = false;
        startY.current = 0;
        return;
      }
      touchStartY = e.touches[0].clientY;
      startY.current = touchStartY;
      hasActivePull.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isRefreshing || !hasActivePull.current) return;
      if (!atTop()) {
        setPullDistance(0);
        return;
      }

      const touchY = e.touches[0].clientY;
      const distance = touchY - startY.current;

      if (distance > 0) {
        e.preventDefault();
        setPullDistance(Math.min(distance, threshold * 1.5));
      }
    };

    const handleTouchEnd = async () => {
      if (!hasActivePull.current) {
        setPullDistance(0);
        return;
      }

      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
      setPullDistance(0);
      hasActivePull.current = false;
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [disabled, isRefreshing, onRefresh, pullDistance, threshold]);

  return {
    containerRef,
    isRefreshing,
    pullDistance,
    isTriggered: pullDistance >= threshold,
  };
};
