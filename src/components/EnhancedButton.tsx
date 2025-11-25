import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { hapticClick } from "@/lib/haptics";

interface EnhancedButtonProps extends ButtonProps {
  glow?: boolean;
  shine?: boolean;
  lift?: boolean;
  ripple?: boolean;
  haptic?: boolean;
}

export const EnhancedButton = ({
  children,
  className,
  glow = false,
  shine = false,
  lift = false,
  ripple = true,
  haptic = true,
  onClick,
  ...props
}: EnhancedButtonProps) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Trigger haptic feedback
    if (haptic) {
      hapticClick();
    }

    // Call original onClick
    onClick?.(e);
  };

  return (
    <Button
      className={cn(
        "transition-all duration-300 rounded-full shadow-lg",
        glow && "hover-glow",
        shine && "animate-shimmer",
        lift && "hover-lift hover:-translate-y-0.5",
        ripple && "ripple-effect",
        "active:scale-95 active:shadow-md",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
    </Button>
  );
};