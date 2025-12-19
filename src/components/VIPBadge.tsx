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
    <span
      className={cn(
        "inline-flex items-center justify-center",
        textSizeClasses[size],
        className
      )}
      title="VIP"
    >
      <span className="text-vip-gold drop-shadow-[0_0_4px_rgba(234,179,8,0.6)]">👑</span>
    </span>
  );
};
