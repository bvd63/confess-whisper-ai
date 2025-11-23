import { useEffect, useMemo, useState } from 'react';
import ConfessionCard, { type ConfessionCardProps } from '@/components/ConfessionCard';
import { useVirtualList } from '@/hooks/useVirtualList';

interface VirtualizedConfessionsProps {
  confessions: ConfessionCardProps['confession'][];
  isPremium: boolean;
  onUpgradeClick: () => void;
  onInsightGenerated: () => void;
  itemHeight?: number; // Approximate height per card
  overscan?: number;
}

/**
 * Lightweight virtualized list for ConfessionCard using our existing useVirtualList hook
 */
const VirtualizedConfessions = ({
  confessions,
  isPremium,
  onUpgradeClick,
  onInsightGenerated,
  itemHeight = 320,
  overscan = 6,
}: VirtualizedConfessionsProps) => {
  const [containerHeight, setContainerHeight] = useState<number>(
    typeof window !== 'undefined' ? Math.max(320, window.innerHeight - 260) : 600
  );

  // Keep itemCount in a memo to avoid unnecessary recalculations
  const itemCount = useMemo(() => confessions.length, [confessions.length]);

  useEffect(() => {
    const onResize = () => {
      const h = Math.max(320, window.innerHeight - 260);
      setContainerHeight(h);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const { virtualItems, totalHeight, containerRef } = useVirtualList({
    itemHeight,
    containerHeight,
    itemCount,
    overscan,
  });

  return (
    <div
      ref={containerRef}
      className="relative overflow-y-auto rounded-lg border border-border/50"
      style={{ height: containerHeight }}
      aria-label="Virtualized confessions list"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {virtualItems.map(({ index, offsetTop }) => {
          const confession = confessions[index];
          if (!confession) return null;
          return (
            <div
              key={confession.id}
              style={{ position: 'absolute', top: offsetTop, left: 0, right: 0, height: itemHeight }}
              className="px-0.5 pb-4"
            >
              <ConfessionCard
                confession={confession}
                isPremium={isPremium}
                onUpgradeClick={onUpgradeClick}
                onInsightGenerated={onInsightGenerated}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VirtualizedConfessions;
