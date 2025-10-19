import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface FloatingElementProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export const FloatingElement = ({ 
  children, 
  className,
  delay = 0
}: FloatingElementProps) => {
  return (
    <div 
      className={cn("animate-float", className)}
    >
      {children}
    </div>
  );
};
