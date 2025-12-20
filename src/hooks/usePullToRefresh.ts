import { useEffect, useRef, useState } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
  container?: HTMLElement | null;
}

export const usePullToRefresh = ({
  onRefresh,
  threshold = 80,
  disabled = false,
  container,
}: UsePullToRefreshOptions) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const hasActivePull = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = container ?? containerRef.current;
    if (disabled || !target) return;
    let touchStartY = 0;

    const atTop = () => target.scrollTop <= 2;

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

    target.addEventListener("touchstart", handleTouchStart, { passive: true });
    target.addEventListener("touchmove", handleTouchMove, { passive: false });
    target.addEventListener("touchend", handleTouchEnd);

    return () => {
      target.removeEventListener("touchstart", handleTouchStart);
      target.removeEventListener("touchmove", handleTouchMove);
      target.removeEventListener("touchend", handleTouchEnd);
    };
  }, [container, disabled, isRefreshing, onRefresh, pullDistance, threshold]);

  return {
    containerRef,
    isRefreshing,
    pullDistance,
    isTriggered: pullDistance >= threshold,
  };
};
