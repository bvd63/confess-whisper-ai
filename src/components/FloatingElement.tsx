import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface FloatingElementProps {
  children: ReactNode;
  className?: string;
}

export const FloatingElement = ({ 
  children, 
  className,
}: FloatingElementProps) => {
  return (
    <div className={cn("animate-float", className)}>
      {children}
    </div>
  );
};
