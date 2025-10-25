import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface VIPBadgeProps {
  tier?: 'free' | 'vip';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const VIPBadge = ({ 
  tier = 'free', 
  size = 'md', 
  showLabel = false,
  className 
}: VIPBadgeProps) => {
  // Don't render anything for free tier
  if (tier !== 'vip') return null;

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const containerSizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs gap-1',
    md: 'px-2 py-1 text-sm gap-1.5',
    lg: 'px-3 py-1.5 text-base gap-2'
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full bg-purple-500/20 text-purple-500 font-semibold transition-transform hover:scale-105 hover:animate-pulse",
        showLabel && containerSizeClasses[size],
        className
      )}
    >
      <Crown className={sizeClasses[size]} />
      {showLabel && <span>VIP</span>}
    </div>
  );
};
