import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ConfessionSkeletonProps {
  count?: number;
}

const ConfessionSkeleton = ({ count = 1 }: ConfessionSkeletonProps) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="p-5 sm:p-6 space-y-4 rounded-3xl shadow-card border-border/50 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-2xl" />
          <Skeleton className="h-4 w-24 sm:w-32 rounded-xl" />
        </div>
        <Skeleton className="h-8 w-8 rounded-xl" />
      </div>

      {/* Content */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-full rounded-xl" />
        <Skeleton className="h-4 w-full rounded-xl" />
        <Skeleton className="h-4 w-3/4 rounded-xl" />
      </div>

      {/* AI Response */}
      <div className="pt-4 space-y-3 border-t border-border/50">
        <Skeleton className="h-4 w-32 rounded-xl" />
        <Skeleton className="h-4 w-full rounded-xl" />
        <Skeleton className="h-4 w-5/6 rounded-xl" />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-3">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-20 sm:w-24 rounded-xl" />
          <Skeleton className="h-10 w-20 sm:w-24 rounded-xl" />
        </div>
        <Skeleton className="h-10 w-24 sm:w-32 rounded-xl" />
      </div>
        </Card>
      ))}
    </>
  );
};

export default ConfessionSkeleton;