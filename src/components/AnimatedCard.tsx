import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ReactNode, HTMLAttributes } from "react";
interface AnimatedCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: 'lift' | 'glow' | 'scale' | 'none';
  glass?: boolean;
  gradient?: boolean;
  delay?: number;
}
export const AnimatedCard = ({
  children,
  className,
  hover = 'lift',
  glass = false,
  gradient = false,
  delay = 0,
  ...props
}: AnimatedCardProps) => {
  const hoverClass = {
    lift: 'hover-lift',
    glow: 'hover-glow',
    scale: 'hover-scale',
    none: ''
  }[hover];
  return;
};