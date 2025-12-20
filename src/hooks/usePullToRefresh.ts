import { useEffect, useRef, useState } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
  container?: HTMLElement | null;
  topTolerance?: number;
}

export const usePullToRefresh = ({
  onRefresh,
  threshold = 80,
  disabled = false,
  container,
  topTolerance = 4,
}: UsePullToRefreshOptions) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isAtTop, setIsAtTop] = useState(true);
  const startY = useRef(0);
  const hasActivePull = useRef(false);
  const startedAtTopRef = useRef(false);
  const refreshLockRef = useRef(false);
  const pointerActiveRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = container ?? containerRef.current;
    if (disabled || !target) return;
    let touchStartY = 0;

    const atTop = () => target.scrollTop <= topTolerance;

    const handleScroll = () => {
      setIsAtTop(atTop());
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (pointerActiveRef.current) return;
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
      if (pointerActiveRef.current) return;
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
      if (pointerActiveRef.current) return;
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

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      pointerActiveRef.current = true;
      const topNow = atTop();
      startedAtTopRef.current = topNow;
      if (!topNow) {
        hasActivePull.current = false;
        startY.current = 0;
        return;
      }
      startY.current = e.clientY;
      hasActivePull.current = true;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      if (isRefreshing || !hasActivePull.current || refreshLockRef.current) return;
      if (!startedAtTopRef.current) return;
      if (!atTop()) {
        setPullDistance(0);
        return;
      }

      const distance = e.clientY - startY.current;

      if (distance > 0) {
        setPullDistance(Math.min(distance, threshold * 1.5));
      }
    };

    const handlePointerEnd = async () => {
      if (!pointerActiveRef.current) return;

      if (refreshLockRef.current) {
        setPullDistance(0);
        return;
      }

      if (!hasActivePull.current || !startedAtTopRef.current) {
        setPullDistance(0);
        pointerActiveRef.current = false;
        startedAtTopRef.current = false;
        hasActivePull.current = false;
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
      pointerActiveRef.current = false;
    };

    target.addEventListener("scroll", handleScroll, { passive: true });
    target.addEventListener("touchstart", handleTouchStart, { passive: true });
    target.addEventListener("touchmove", handleTouchMove, { passive: false });
    target.addEventListener("touchend", handleTouchEnd);
    target.addEventListener("pointerdown", handlePointerDown, { passive: true });
    target.addEventListener("pointermove", handlePointerMove, { passive: false });
    target.addEventListener("pointerup", handlePointerEnd);
    target.addEventListener("pointercancel", handlePointerEnd);

    return () => {
      target.removeEventListener("scroll", handleScroll);
      target.removeEventListener("touchstart", handleTouchStart);
      target.removeEventListener("touchmove", handleTouchMove);
      target.removeEventListener("touchend", handleTouchEnd);
      target.removeEventListener("pointerdown", handlePointerDown);
      target.removeEventListener("pointermove", handlePointerMove);
      target.removeEventListener("pointerup", handlePointerEnd);
      target.removeEventListener("pointercancel", handlePointerEnd);
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
