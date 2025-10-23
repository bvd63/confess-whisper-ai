import { Crown, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/state/SubscriptionProvider";
import { cn } from "@/lib/utils";

interface SubscriptionBadgeProps {
  tier?: 'free' | 'premium' | 'vip'; // Optional - if not provided, uses useSubscription hook
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact';
  showTooltip?: boolean;
}

export const SubscriptionBadge = ({ 
  tier: providedTier,
  className, 
  showLabel = true,
  size = 'md',
  variant = 'default',
  showTooltip = true
}: SubscriptionBadgeProps) => {
  const { subscriptionTier: hookTier, isLoading } = useSubscription();
  const subscriptionTier = providedTier || hookTier;

  if (isLoading || subscriptionTier === 'free') {
    return null;
  }

  const config = {
    premium: {
      icon: Zap,
      label: 'Premium',
      className: 'bg-gradient-to-r from-purple-600 to-purple-400 text-white border-purple-400/50',
      glow: 'shadow-[0_0_20px_rgba(168,85,247,0.5)]'
    },
    vip: {
      icon: Crown,
      label: 'VIP',
      className: 'bg-gradient-to-r from-yellow-500 to-yellow-300 text-black border-yellow-400/50',
      glow: 'shadow-[0_0_25px_rgba(234,179,8,0.6)]'
    }
  };

  const tierConfig = config[subscriptionTier as 'premium' | 'vip'];
  if (!tierConfig) return null;

  const Icon = tierConfig.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-sm gap-1.5',
    lg: 'px-4 py-1.5 text-base gap-2'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <Badge 
      className={cn(
        tierConfig.className,
        tierConfig.glow,
        'font-semibold border-2 animate-in fade-in zoom-in duration-300',
        sizeClasses[size],
        className
      )}
    >
      <Icon className={iconSizes[size]} />
      {showLabel && tierConfig.label}
    </Badge>
  );
};
