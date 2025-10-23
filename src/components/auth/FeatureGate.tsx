import UpgradeTeaser from "@/components/paywall/UpgradeTeaser";
import { useEntitlements } from "@/state/SubscriptionProvider";
import { getSupabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
type Props = {
  children: React.ReactNode;
  minTier: "vip";
  className?: string;
  teaserPriceHint?: string;
  featuresOverride?: string[];
  onUpgradeOverride?: () => Promise<void> | void;
  compact?: boolean;
  cadence?: "monthly" | "yearly";
  priceIdOverride?: string;
};
export function FeatureGate({
  children,
  minTier,
  className,
  teaserPriceHint,
  featuresOverride,
  onUpgradeOverride,
  compact,
  cadence = "monthly",
  priceIdOverride
}: Props) {
  const {
    entitlements,
    loading,
    setOptimisticTier
  } = useEntitlements();
  const supabase = getSupabase();
  const {
    toast
  } = useToast();
  if (loading) return null;
  const hasAccess = !!entitlements?.is_vip;
  if (hasAccess) return <>{children}</>;
  async function onUpgrade() {
    if (onUpgradeOverride) return onUpgradeOverride();
    try {
      setOptimisticTier(minTier);
      const payload: any = {
        op: "upgrade",
        target: minTier,
        cadence
      };
      if (priceIdOverride) payload.price_id = priceIdOverride;
      const {
        error
      } = await supabase.functions.invoke("manage-subscription-v2", {
        body: payload
      });
      if (error) throw error;
      toast({
        title: "Plan updated",
        description: "Syncing your account…"
      });
    } catch (e: any) {
      toast({
        title: "Upgrade failed",
        description: e?.message || "Please try again.",
        variant: "destructive"
      });
    }
  }
  return (
    <UpgradeTeaser
      target={minTier}
      onUpgrade={onUpgrade}
      features={featuresOverride}
      priceHint={teaserPriceHint}
      className={className}
      small={compact}
    />
  );
}