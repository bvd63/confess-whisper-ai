import { Button } from "@/components/ui/button";
import { Sparkles, Crown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface FlairsShopButtonProps {
  onClick: () => void;
  tier: "free" | "premium" | "vip";
  className?: string;
}

export const FlairsShopButton = ({ onClick, tier, className }: FlairsShopButtonProps) => {
  const { t } = useLanguage();

  const getTierStyles = () => {
    switch (tier) {
      case "free":
        return "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl transition-all duration-300";
      case "premium":
        return "bg-gradient-to-r from-violet-500 via-purple-500 to-violet-600 hover:from-violet-600 hover:via-purple-600 hover:to-violet-700 text-white shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 transition-all duration-300";
      case "vip":
        return "bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:via-yellow-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 border-2 border-amber-400 transition-all duration-300";
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
