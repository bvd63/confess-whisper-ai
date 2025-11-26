import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

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

  const { t } = useLanguage();

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
        "inline-flex items-center rounded-full border border-vip/40 bg-vip/10 font-semibold text-vip transition-transform hover:scale-105",
        showLabel && containerSizeClasses[size],
        className
      )}
      title={t.subscription_plan_vip}
    >
      <span className={cn(textSizeClasses[size], "animate-pulse")}>👑</span>
      {showLabel && <span className="text-xs font-semibold uppercase tracking-wide">{t.subscription_plan_vip}</span>}
    </div>
  );
};
