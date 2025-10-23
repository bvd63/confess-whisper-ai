import { Crown, Star, Lock, Check, Zap } from "lucide-react";
type Props = {
  target: "vip";
  onUpgrade: () => Promise<void> | void;
  features?: string[];
  priceHint?: string;
  className?: string;
  small?: boolean;
};
export default function UpgradeTeaser({
  target,
  onUpgrade,
  features,
  priceHint,
  className,
  small
}: Props) {
  const isVip = target === "vip";
  const Icon = Crown;
  const title = "VIP Access";
  const desc = "Unlock the full ConfessAI experience with priority features and exclusive perks.";
  const defaultFeatures = ["AI replies priority", "Higher limits / unlimited", "VIP-only insights", "Early access"];
  const bullets = features?.length ? features : defaultFeatures;
  return <div className={["relative overflow-hidden rounded-2xl border", "border-primary/25 bg-background/60 backdrop-blur-sm", "shadow-[0_10px_40px_rgba(0,0,0,0.20)]", small ? "p-4" : "p-5", className || ""].join(" ")}>
      {/* glow gradient */}
      <div aria-hidden className="pointer-events-none absolute -inset-1 rounded-3xl opacity-40 blur-2xl bg-gradient-to-r from-fuchsia-500 via-amber-400 to-cyan-400" />
      
    </div>;
}