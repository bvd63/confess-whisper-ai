import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ConfessionSkeletonProps {
  count?: number;
}

const ConfessionSkeleton = ({ count = 1 }: ConfessionSkeletonProps) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} variant="glow" className="p-4 sm:p-5 space-y-3 sm:space-y-4 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Skeleton className="h-6 w-6 sm:h-8 sm:w-8 rounded-full" />
          <Skeleton className="h-3 w-20 sm:h-4 sm:w-24" />
        </div>
        <Skeleton className="h-6 w-6 sm:h-8 sm:w-8 rounded" />
      </div>

      {/* Content */}
      <div className="space-y-1.5 sm:space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* AI Response */}
      <div className="pt-2 sm:pt-3 space-y-1.5 sm:space-y-2 border-t border-border/60">
        <Skeleton className="h-3 w-24 sm:h-4 sm:w-32" />
        <Skeleton className="h-3 w-full sm:h-4" />
        <Skeleton className="h-3 w-5/6 sm:h-4" />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-1.5 sm:pt-2">
        <div className="flex gap-1.5 sm:gap-2">
          <Skeleton className="h-8 w-16 sm:h-9 sm:w-20 rounded-xl" />
          <Skeleton className="h-8 w-16 sm:h-9 sm:w-20 rounded-xl" />
        </div>
        <Skeleton className="h-8 w-20 sm:h-9 sm:w-28 rounded-xl" />
      </div>
        </Card>
      ))}
    </>
  );
};

export default ConfessionSkeleton;