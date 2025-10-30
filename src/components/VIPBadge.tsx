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

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const containerSizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs gap-1',
    md: 'px-2 py-1 text-sm gap-1.5',
    lg: 'px-3 py-1.5 text-base gap-2'
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full bg-gradient-to-r from-yellow-500/20 to-amber-500/20 font-semibold transition-transform hover:scale-105",
        showLabel && containerSizeClasses[size],
        className
      )}
      title="VIP"
    >
      <span className={cn(textSizeClasses[size], "animate-pulse")}>👑</span>
      {showLabel && <span className="text-yellow-600">VIP</span>}
    </div>
  );
};
