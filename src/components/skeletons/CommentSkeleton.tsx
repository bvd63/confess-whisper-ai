import { Skeleton } from '@/components/ui/skeleton';

export const CommentSkeleton = () => {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-card/70 border border-border/60 backdrop-blur-sm shadow-sm">
      <div className="flex gap-3">
        {/* Avatar */}
        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
        
        <div className="flex-1 space-y-3">
          {/* Username and time */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          
          {/* Comment text */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-10/12" />
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <Skeleton className="h-6 w-14" />
            <Skeleton className="h-6 w-14" />
          </div>
        </div>
      </div>
    </div>
  );
};
