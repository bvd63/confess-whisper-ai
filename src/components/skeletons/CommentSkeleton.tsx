import { Skeleton } from '@/components/ui/skeleton';

export const CommentSkeleton = () => {
  return (
    <div className="flex gap-3 p-4 border-b">
      {/* Avatar */}
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      
      <div className="flex-1 space-y-2">
        {/* Username and time */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        
        {/* Comment text */}
        <div className="space-y-1">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-6 w-12" />
        </div>
      </div>
    </div>
  );
};
