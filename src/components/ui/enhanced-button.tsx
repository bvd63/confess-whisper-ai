import * as React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/hooks/useHaptic';

export interface EnhancedButtonProps extends ButtonProps {
  loading?: boolean;
  haptic?: 'light' | 'medium' | 'heavy';
  ripple?: boolean;
  loadingText?: string;
}

/**
 * Enhanced Button with loading states, haptic feedback, and ripple effects
 * 
 * @example
 * <EnhancedButton loading={isLoading} haptic="medium">
 *   Submit
 * </EnhancedButton>
 */
export const EnhancedButton = React.forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({ 
    className, 
    children, 
    disabled, 
    loading, 
    haptic = 'light',
    ripple = true,
    loadingText,
    onClick,
    ...props 
  }, ref) => {
    const { vibrate } = useHaptic();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) return;
      
      // Haptic feedback
      vibrate(haptic);
      
      // Ripple effect
      if (ripple) {
        const button = e.currentTarget;
        const circle = document.createElement('span');
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;
        
        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${e.clientX - button.offsetLeft - radius}px`;
        circle.style.top = `${e.clientY - button.offsetTop - radius}px`;
        circle.classList.add('ripple');
        
        const rippleEffect = button.getElementsByClassName('ripple')[0];
        if (rippleEffect) {
          rippleEffect.remove();
        }
        
        button.appendChild(circle);
      }
      
      onClick?.(e);
    };

    return (
      <Button
        ref={ref}
        className={cn(
          'relative overflow-hidden transition-all',
          loading && 'cursor-wait',
          className
        )}
        disabled={disabled || loading}
        onClick={handleClick}
        {...props}
      >
        {loading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {loading && loadingText ? loadingText : children}
      </Button>
    );
  }
);

EnhancedButton.displayName = 'EnhancedButton';
