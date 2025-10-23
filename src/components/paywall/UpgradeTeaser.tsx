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

  return (
    <div
      className={[
        "relative overflow-hidden rounded-2xl border",
        "border-primary/25 bg-background/60 backdrop-blur-sm",
        "shadow-[0_10px_40px_rgba(0,0,0,0.20)]",
        small ? "p-4" : "p-5",
        className || ""
      ].join(" ")}
    >
      {/* glow gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-1 rounded-3xl opacity-40 blur-2xl bg-gradient-to-r from-fuchsia-500 via-amber-400 to-cyan-400"
      />
      <div className="relative flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 ring-1 ring-white/10"
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className={small ? "text-base font-semibold" : "text-lg font-semibold"}>
              {title}
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 bg-amber-500/15 ring-amber-500/30 text-amber-200"
            >
              <Lock className="h-3 w-3" />
              VIP
            </span>
            {priceHint && (
              <span className="ml-auto text-xs text-foreground/60">{priceHint}</span>
            )}
          </div>

          {!small && <p className="text-sm text-foreground/70">{desc}</p>}

          <ul className="mt-3 grid gap-1.5">
            {bullets.map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-foreground/80">
                <Check className="h-4 w-4 text-primary/80" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-[11px] text-muted-foreground">
              Cancel anytime. No hidden fees.
            </div>
            <button
              onClick={onUpgrade}
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium text-white bg-primary hover:brightness-110 active:scale-[0.98] transition"
            >
              <Zap className="h-4 w-4 mr-2" />
              Upgrade to VIP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
