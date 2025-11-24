import { useLanguage } from "@/contexts/LanguageContext";
import { Crown, Star, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProfileTierBadgeProps {
  tier: "free" | "vip";
  className?: string;
  variant?: "default" | "compact";
}

export const ProfileTierBadge = ({ 
  tier, 
  className,
  variant = "default" 
}: ProfileTierBadgeProps) => {
  const { t } = useLanguage();

  const getTierConfig = () => {
    switch (tier) {
      case "free":
        return {
          label: t.profile_tiers_free,
          icon: null,
          className: "bg-secondary text-secondary-foreground border-border",
        };
      case "vip":
      return {
        label: t.profile_tiers_vip,
        icon: Crown,
        className: "bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-white dark:text-white border-0 shadow-ios shadow-amber-500/30",
      };
    }
  };

  const config = getTierConfig();
  const Icon = config.icon;
  const isCompact = variant === "compact";

  return (
    <Badge 
      className={cn(
        "relative font-semibold cursor-default rounded-full",
        isCompact ? "text-xs px-3 py-1" : "text-sm px-4 py-1.5",
        config.className,
        className
      )}
    >
      {Icon && <Icon className={cn("mr-1.5", isCompact ? "w-3 h-3" : "w-4 h-4")} />}
      {config.label}
    </Badge>
  );
};
