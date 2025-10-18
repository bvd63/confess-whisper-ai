import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GradientTextProps {
  children: ReactNode;
  className?: string;
  variant?: 'primary' | 'hero';
}

export const GradientText = ({ 
  children, 
  className,
  variant = 'primary'
}: GradientTextProps) => {
  return (
    <span 
      className={cn(
        variant === 'primary' ? 'text-gradient' : 'text-gradient-hero',
        "font-bold",
        className
      )}
    >
      {children}
    </span>
  );
};
