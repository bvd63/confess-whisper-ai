import * as React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Animation variant
   * @default 'lift'
   */
  animation?: 'lift' | 'scale' | 'glow' | 'none';
  /**
   * Delay before animation starts (in ms)
   */
  delay?: number;
}

/**
 * Card component with built-in hover animations
 * 
 * @example
 * <AnimatedCard animation="lift">
 *   <CardHeader>...</CardHeader>
 * </AnimatedCard>
 */
export const AnimatedCard = React.forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ className, animation = 'lift', delay = 0, children, ...props }, ref) => {
    const animationClasses = {
      lift: 'hover-lift',
      scale: 'hover-scale',
      glow: 'hover-glow',
      none: '',
    };

    return (
      <Card
        ref={ref}
        className={cn(
          'animate-fade-in',
          animationClasses[animation],
          className
        )}
        style={{ animationDelay: `${delay}ms` }}
        {...props}
      >
        {children}
      </Card>
    );
  }
);

AnimatedCard.displayName = 'AnimatedCard';
