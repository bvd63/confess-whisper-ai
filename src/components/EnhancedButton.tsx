import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EnhancedButtonProps extends ButtonProps {
  glow?: boolean;
  shine?: boolean;
  lift?: boolean;
}

export const EnhancedButton = ({ 
  children, 
  className, 
  glow = false,
  shine = false,
  lift = false,
  ...props 
}: EnhancedButtonProps) => {
  return (
    <Button
      className={cn(
        "active-scale transition-all duration-300",
        glow && "hover-glow",
        shine && "hover-shine",
        lift && "hover-lift",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
};
