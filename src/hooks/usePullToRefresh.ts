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
  const pullDistanceRef = useRef(0);
  const onRefreshRef = useRef(onRefresh);
  const thresholdRef = useRef(threshold);
  const topToleranceRef = useRef(topTolerance);
  const disabledRef = useRef(disabled);
  const refreshingRef = useRef(isRefreshing);

  // Keep refs in sync without re-binding listeners (prevents missed pointer lifecycles mid-pull)
  useEffect(() => {
    onRefreshRef.current = onRefresh;
    thresholdRef.current = threshold;
    topToleranceRef.current = topTolerance;
    disabledRef.current = disabled;
    refreshingRef.current = isRefreshing;
  }, [onRefresh, threshold, topTolerance, disabled, isRefreshing]);

  useEffect(() => {
    const target = container ?? containerRef.current;
    if (!target || disabledRef.current) return;
    let touchStartY = 0;

    // Instagram-like gating: only allow pull-to-refresh when the scroll container is at (or extremely near) the top
    const atTop = () => target.scrollTop <= topToleranceRef.current;

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
      if (refreshingRef.current || !hasActivePull.current || refreshLockRef.current) return;
      if (!startedAtTopRef.current) return;
      if (!atTop()) {
        setPullDistance(0);
        return;
      }

      const touchY = e.touches[0].clientY;
      const distance = touchY - startY.current;

      if (distance > 0) {
        e.preventDefault();
        const next = Math.min(distance, thresholdRef.current * 1.5);
        pullDistanceRef.current = next;
        setPullDistance(next);
      }
    };

    const handleTouchEnd = async () => {
      if (pointerActiveRef.current) return;
      if (refreshLockRef.current) {
        pullDistanceRef.current = 0;
        setPullDistance(0);
        return;
      }

      if (!hasActivePull.current || !startedAtTopRef.current) {
        setPullDistance(0);
        return;
      }

      const distance = pullDistanceRef.current;
      if (distance >= thresholdRef.current && !refreshingRef.current) {
        refreshLockRef.current = true;
        setIsRefreshing(true);
        refreshingRef.current = true;
        try {
          await onRefreshRef.current();
        } finally {
          setIsRefreshing(false);
          refreshingRef.current = false;
          refreshLockRef.current = false;
        }
      }
      pullDistanceRef.current = 0;
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
      if (refreshingRef.current || !hasActivePull.current || refreshLockRef.current) return;
      if (!startedAtTopRef.current) return;
      if (!atTop()) {
        setPullDistance(0);
        return;
      }

      const distance = e.clientY - startY.current;

      if (distance > 0) {
        const next = Math.min(distance, thresholdRef.current * 1.5);
        pullDistanceRef.current = next;
        setPullDistance(next);
      }
    };

    const handlePointerEnd = async () => {
      if (!pointerActiveRef.current) return;

      if (refreshLockRef.current) {
        pullDistanceRef.current = 0;
        setPullDistance(0);
        pointerActiveRef.current = false;
        return;
      }

      if (!hasActivePull.current || !startedAtTopRef.current) {
        setPullDistance(0);
        pointerActiveRef.current = false;
        startedAtTopRef.current = false;
        hasActivePull.current = false;
        return;
      }

      const distance = pullDistanceRef.current;
      if (distance >= thresholdRef.current && !refreshingRef.current) {
        refreshLockRef.current = true;
        setIsRefreshing(true);
        refreshingRef.current = true;
        try {
          await onRefreshRef.current();
        } finally {
          setIsRefreshing(false);
          refreshingRef.current = false;
          refreshLockRef.current = false;
        }
      }
      pullDistanceRef.current = 0;
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
  }, [container]);

  return {
    containerRef,
    isRefreshing,
    pullDistance,
    isTriggered: pullDistance >= threshold,
    isAtTop,
  };
};
