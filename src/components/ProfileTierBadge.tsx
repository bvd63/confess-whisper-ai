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
          className: "bg-secondary text-secondary-foreground border-border/50",
        };
      case "vip":
        return {
          label: t.profile_tiers_vip,
          icon: Crown,
          className: "bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700] text-[#1A1A1F] dark:text-[#0B0B0F] border-[#FFD700]/30 shadow-lg shadow-[#FFD700]/30",
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
      {tier === "vip" && !isCompact && (
        <Sparkles className="absolute -top-0.5 -right-0.5 w-3 h-3 text-[#FFD700] animate-pulse" />
      )}
    </Badge>
  );
};
