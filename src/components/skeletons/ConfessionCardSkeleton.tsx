import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export const ConfessionCardSkeleton = () => {
  return (
    <Card className="w-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#2a2e5c]/90 via-[#19192f]/90 to-[#0d0d1b]/90 backdrop-blur-md p-5 sm:p-6 space-y-4 shadow-[0_20px_50px_rgba(0,0,0,0.45),_inset_0_1px_1px_rgba(255,255,255,0.1)]">
      {/* Header: Avatar + Username */}
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-white/10 animate-pulse flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
          <div className="h-3 w-24 bg-white/10 rounded animate-pulse" />
        </div>
      </div>

      {/* Content lines */}
      <div className="space-y-2">
        <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
        <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-white/10 rounded animate-pulse" />
      </div>

      {/* Reactions placeholder */}
      <div className="pt-2 flex gap-1">
        <div className="h-7 w-14 bg-white/10 rounded-full animate-pulse" />
        <div className="h-7 w-14 bg-white/10 rounded-full animate-pulse" />
        <div className="h-7 w-14 bg-white/10 rounded-full animate-pulse" />
      </div>

      {/* Comment button placeholder */}
      <div className="flex items-center justify-between pt-2">
        <div className="h-4 w-12 bg-white/10 rounded animate-pulse" />
        <div className="h-8 w-8 rounded-full bg-white/10 animate-pulse" />
      </div>
    </Card>
  );
};
