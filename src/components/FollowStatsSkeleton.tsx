import { Skeleton } from "@/components/ui/skeleton";

const FollowStatsSkeleton = () => {
  return (
    <div className="glass rounded-lg p-4 mb-6 animate-pulse">
      <div className="flex items-center justify-around gap-4">
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
};

export default FollowStatsSkeleton;
