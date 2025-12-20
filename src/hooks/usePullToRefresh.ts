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
  const [isAtTop, setIsAtTop] = useState(true);
  const startY = useRef(0);
  const hasActivePull = useRef(false);
  const startedAtTopRef = useRef(false);
  const refreshLockRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = container ?? containerRef.current;
    if (disabled || !target) return;
    let touchStartY = 0;

    const atTop = () => target.scrollTop <= 2;

    const handleScroll = () => {
      setIsAtTop(atTop());
    };

    const handleTouchStart = (e: TouchEvent) => {
      const topNow = atTop();
      startedAtTopRef.current = topNow;
      if (!topNow) {
        hasActivePull.current = false;
        startY.current = 0;
        return;
      }
      touchStartY = e.touches[0].clientY;
      startY.current = touchStartY;
      hasActivePull.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isRefreshing || !hasActivePull.current || refreshLockRef.current) return;
      if (!startedAtTopRef.current) return;
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
      if (refreshLockRef.current) {
        setPullDistance(0);
        return;
      }

      if (!hasActivePull.current || !startedAtTopRef.current) {
        setPullDistance(0);
        return;
      }

      if (pullDistance >= threshold && !isRefreshing) {
        refreshLockRef.current = true;
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          refreshLockRef.current = false;
        }
      }
      setPullDistance(0);
      hasActivePull.current = false;
      startedAtTopRef.current = false;
    };

    target.addEventListener("scroll", handleScroll, { passive: true });
    target.addEventListener("touchstart", handleTouchStart, { passive: true });
    target.addEventListener("touchmove", handleTouchMove, { passive: false });
    target.addEventListener("touchend", handleTouchEnd);

    return () => {
      target.removeEventListener("scroll", handleScroll);
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
    isAtTop,
  };
};
