import { ReactNode } from "react";
import { AnimatedCard } from "./AnimatedCard";
import { cn } from "@/lib/utils";

interface TierProfileCardProps {
  tier: "free" | "premium" | "vip";
  children: ReactNode;
  className?: string;
}

export const TierProfileCard = ({ tier, children, className }: TierProfileCardProps) => {
  const getTierStyles = () => {
    switch (tier) {
      case "vip":
        return {
          background: "bg-gradient-to-br from-amber-500/5 via-yellow-500/5 to-amber-600/5",
          border: "border-amber-500/30",
          shadow: "shadow-xl shadow-amber-500/20",
          glow: "before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-amber-500/0 before:via-amber-500/10 before:to-amber-500/0 before:animate-[shimmer_3s_ease-in-out_infinite] before:pointer-events-none",
        };
      case "premium":
        return {
          background: "bg-gradient-to-br from-violet-500/5 via-purple-500/5 to-pink-500/5",
          border: "border-violet-500/30",
          shadow: "shadow-lg shadow-violet-500/20",
          glow: "before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-violet-500/0 before:via-violet-500/10 before:to-violet-500/0 before:animate-[shimmer_3s_ease-in-out_infinite] before:pointer-events-none",
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
