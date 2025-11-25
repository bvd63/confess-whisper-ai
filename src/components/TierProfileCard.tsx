import { ReactNode } from "react";
import { AnimatedCard } from "./AnimatedCard";
import { cn } from "@/lib/utils";

interface TierProfileCardProps {
  tier: "free" | "vip";
  children: ReactNode;
  className?: string;
}

export const TierProfileCard = ({ tier, children, className }: TierProfileCardProps) => {
  const getTierStyles = () => {
    switch (tier) {
      case "vip":
        return {
          background: "bg-gradient-to-br from-vip-gold/5 via-vip-gold/5 to-vip-gold/10 dark:from-vip-gold/10 dark:via-vip-gold/5 dark:to-vip-gold/15",
          border: "border-vip-gold/30 dark:border-vip-gold/40",
          shadow: "shadow-lg shadow-vip-gold/10 dark:shadow-vip-gold/20",
          glow: "before:absolute before:inset-0 before:rounded-[18px] before:bg-gradient-to-r before:from-vip-gold/0 before:via-vip-gold/10 before:to-vip-gold/0 before:animate-[shimmer_3s_ease-in-out_infinite] before:pointer-events-none",
        };
      default:
        return {
          background: "",
          border: "",
          shadow: "",
          glow: "",
        };
    }
  };

  const styles = getTierStyles();

  return (
    <AnimatedCard
      hover="lift"
      glass
      className={cn(
        "relative overflow-hidden",
        styles.background,
        styles.border,
        styles.shadow,
        styles.glow,
        className
      )}
    >
      {children}
    </AnimatedCard>
  );
};
