import { useLanguage } from "@/contexts/LanguageContext";

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
          label: "👑",
          icon: null,
          className: "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-vip-gold border-vip-gold/30 shadow-[0_0_8px_rgba(234,179,8,0.4)]",
        };
    }
  };

  const config = getTierConfig();
  const Icon = config.icon;
  const isCompact = variant === "compact";

  return (
    <Badge 
      className={cn(
        "relative font-semibold cursor-default",
        isCompact ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1",
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  );
};
