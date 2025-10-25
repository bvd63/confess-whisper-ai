import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Shape variant
   * @default 'rectangle'
   */
  variant?: 'rectangle' | 'circle' | 'text';
  /**
   * Number of skeleton items to render
   * @default 1
   */
  count?: number;
}

/**
 * Skeleton loader for indicating loading states
 * 
 * @example
 * <SkeletonLoader variant="text" count={3} />
 * <SkeletonLoader variant="circle" className="w-12 h-12" />
 */
export function SkeletonLoader({ 
  className, 
  variant = 'rectangle',
  count = 1,
  ...props 
}: SkeletonProps) {
  const variantClasses = {
    rectangle: 'rounded-md',
    circle: 'rounded-full',
    text: 'rounded h-4 w-full',
  };

  const items = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={cn(
        'skeleton bg-muted',
        variantClasses[variant],
        variant === 'text' && i < count - 1 && 'mb-2',
        className
      )}
      {...props}
    />
  ));

  return <>{items}</>;
}
