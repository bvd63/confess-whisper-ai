import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const UserCardSkeleton = () => {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        {/* Avatar */}
        <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
        
        <div className="flex-1 space-y-2">
          {/* Username */}
          <Skeleton className="h-4 w-32" />
          
          {/* Bio */}
          <Skeleton className="h-3 w-48" />
          
          {/* Stats */}
          <div className="flex items-center gap-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        
        {/* Follow button */}
        <Skeleton className="h-9 w-20" />
      </CardContent>
    </Card>
  );
};
