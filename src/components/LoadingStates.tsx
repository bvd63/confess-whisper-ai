import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PageLoadingProps {
  className?: string;
}

/**
 * Full page loading skeleton for initial page loads
 */
export const PageLoading = ({ className }: PageLoadingProps) => {
  return (
    <div className={cn("flex flex-col gap-4 p-4 animate-fade-in", className)}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>

      {/* Content skeletons */}
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="space-y-3 p-4 border border-border rounded-lg">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
};

interface ButtonLoadingProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Inline button loading spinner
 */
export const ButtonLoading = ({ size = "md", className }: ButtonLoadingProps) => {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <Loader2
      className={cn("animate-spin", sizeClasses[size], className)}
      aria-label="Loading"
    />
  );
};

interface ContentLoadingProps {
  lines?: number;
  className?: string;
}

/**
 * Content skeleton with multiple text lines
 */
export const ContentLoading = ({ lines = 3, className }: ContentLoadingProps) => {
  return (
    <div className={cn("space-y-2 animate-fade-in", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn(
            "h-4",
            index === lines - 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  );
};

interface CardLoadingProps {
  count?: number;
  className?: string;
}

/**
 * Card skeleton for list views
 */
export const CardLoading = ({ count = 1, className }: CardLoadingProps) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "space-y-4 p-6 border border-border rounded-lg animate-pulse",
            className
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-8 w-8" />
          </div>
          
          <ContentLoading lines={3} />
          
          <div className="flex items-center gap-2 pt-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      ))}
    </>
  );
};
