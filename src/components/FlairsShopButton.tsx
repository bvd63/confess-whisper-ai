import { Button } from "@/components/ui/button";
import { Sparkles, Crown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface FlairsShopButtonProps {
  onClick: () => void;
  tier: "free" | "vip";
  className?: string;
}

export const FlairsShopButton = ({ onClick, tier, className }: FlairsShopButtonProps) => {
  const { t } = useLanguage();

  const getTierStyles = () => {
    switch (tier) {
      case "free":
        return "bg-primary text-primary-foreground hover:bg-primary-hover shadow-lg shadow-primary/30 transition-all duration-300";
      case "vip":
        return "border border-vip/50 bg-gradient-to-r from-vip/80 to-warning/80 text-foreground shadow-lg shadow-vip/30 transition-all duration-300";
    }
  };

  return (
    <Button
      onClick={onClick}
      className={cn(
        "relative font-semibold gap-2 overflow-hidden",
        getTierStyles(),
        className
      )}
      size="default"
    >
      <div className="relative z-10 flex items-center gap-2">
        {tier === "vip" && <Crown className="w-4 h-4" />}
        <Sparkles className="w-4 h-4" />
        <span>{t.shop_open}</span>
      </div>
    </Button>
  );
};
