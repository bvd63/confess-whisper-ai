import { Skeleton } from "@/components/ui/skeleton";

const QuoteOfTheDaySkeleton = () => {
  return (
    <div className="glass rounded-lg p-6 mb-6 animate-pulse">
      <div className="flex items-start gap-3">
        <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-3 w-24 mt-2" />
        </div>
      </div>
    </div>
  );
};

export default QuoteOfTheDaySkeleton;
