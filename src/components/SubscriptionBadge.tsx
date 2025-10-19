import { Crown, Sparkles, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface SubscriptionBadgeProps {
  tier: 'free' | 'premium' | 'vip';
  variant?: 'default' | 'compact' | 'inline';
  showTooltip?: boolean;
  animated?: boolean;
}

export const SubscriptionBadge = ({ 
  tier, 
  variant = 'default', 
  showTooltip = true,
  animated = true 
}: SubscriptionBadgeProps) => {
  const { t } = useLanguage();

  const getBadgeConfig = () => {
    switch (tier) {
      case 'vip':
        return {
          icon: Crown,
          label: t.plans_vip_title || 'VIP',
          className: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0',
          iconClassName: animated ? 'animate-pulse-glow' : '',
          tooltip: t.plans_vip_tooltip || 'VIP Member - Premium access with exclusive benefits'
        };
      case 'premium':
        return {
          icon: Sparkles,
          label: t.plans_premium_title || 'Premium',
          className: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white border-0',
          iconClassName: '',
          tooltip: t.plans_premium_tooltip || 'Premium Member - Enhanced experience'
        };
      default:
        return {
          icon: Shield,
          label: t.plans_free_title || 'Free',
          className: 'bg-muted text-muted-foreground',
          iconClassName: '',
          tooltip: t.plans_free_tooltip || 'Free Member'
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  const badgeContent = (
    <Badge 
      className={cn(
        config.className,
        variant === 'compact' && 'px-2 py-0.5 text-[10px]',
        variant === 'inline' && 'px-1.5 py-0 text-[9px]',
        'flex items-center gap-1'
      )}
    >
      <Icon className={cn(
        variant === 'compact' ? 'w-3 h-3' : variant === 'inline' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5',
        config.iconClassName
      )} />
      {variant !== 'inline' && <span>{config.label}</span>}
    </Badge>
  );

  if (!showTooltip) return badgeContent;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};