import { useEffect, useMemo, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabaseClient";
import { SubscriptionContext, type Entitlements, type SubscriptionTier, type SubscriptionCadence } from "./types";

const defaultSubscriptions: Record<SubscriptionTier, SubscriptionCadence> = {
  free: "monthly",
  vip: "monthly",
};

const normalizeTier = (profile: Record<string, unknown>) => {
  const tier = profile.subscription_tier === "vip" || profile.is_premium ? "vip" : "free";
  const trialActive = Boolean(
    profile.trial_active &&
      typeof profile.trial_premium_ends_at === "string" &&
      new Date(profile.trial_premium_ends_at) > new Date(),
  );
  return trialActive ? "vip" : tier;
};

const mapProfileToEntitlements = (userId: string, profile: Record<string, unknown>): Entitlements => {
  const tier = normalizeTier(profile);
  const cadence = (profile.subscription_cadence as SubscriptionCadence) || defaultSubscriptions[tier];
  const status = (profile.subscription_status as string) || (profile.stripe_subscription_id ? "active" : "canceled");
  return {
    user_id: userId,
    tier,
    cadence,
    status,
    cancel_at_period_end: Boolean(profile.subscription_cancel_at_period_end),
    current_period_end: (profile.subscription_ends_at as string) || null,
    is_pro: tier === "vip",
    is_vip: tier === "vip",
  };
};

export const SubscriptionProvider = ({ children }: { children: React.ReactNode }) => {
  const supabase = getSupabase();
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let channel: RealtimeChannel | null = null;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "subscription_tier, subscription_cadence, is_premium, subscription_ends_at, stripe_subscription_id, subscription_cancel_at_period_end, trial_active, trial_premium_ends_at, subscription_status",
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (mounted && profile) {
        setEntitlements(mapProfileToEntitlements(user.id, profile));
        setLoading(false);
      }

      channel = supabase
        .channel(`sub:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "profiles",
            filter: `user_id=eq.${user.id}`,
          },
          async () => {
            const { data: updatedProfile } = await supabase
              .from("profiles")
              .select(
                "subscription_tier, subscription_cadence, is_premium, subscription_ends_at, stripe_subscription_id, subscription_cancel_at_period_end, trial_active, trial_premium_ends_at, subscription_status",
              )
              .eq("user_id", user.id)
              .maybeSingle();

            if (updatedProfile && mounted) {
              setEntitlements(mapProfileToEntitlements(user.id, updatedProfile));
            }
          },
        )
        .subscribe();
    })();

    return () => {
      mounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [supabase]);

  const setOptimisticTier = (tier: SubscriptionTier) =>
    setEntitlements((current) =>
      current
        ? {
            ...current,
            tier,
            is_pro: tier === "vip",
            is_vip: tier === "vip",
          }
        : current,
    );

  const value = useMemo(
    () => ({ entitlements, loading, setOptimisticTier }),
    [entitlements, loading],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};
