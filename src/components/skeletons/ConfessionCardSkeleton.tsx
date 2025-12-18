import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const ConfessionCardSkeleton = () => {
  return (
    <Card variant="glow" className="w-full p-4 sm:p-5">
      <CardHeader className="space-y-4 pb-4">
        {/* User info */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-0">
        {/* Content */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Image placeholder */}
        <Skeleton className="h-48 w-full rounded-xl" />

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Skeleton className="h-9 w-16 rounded-xl" />
          <Skeleton className="h-9 w-16 rounded-xl" />
          <Skeleton className="h-9 w-16 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
};
