import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";

type Ent = {
  user_id: string;
  tier: "free" | "vip";
  cadence: "monthly" | "yearly";
  status: string;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
  is_pro: boolean;
  is_vip: boolean;
};

type Ctx = {
  entitlements: Ent | null;
  loading: boolean;
  setOptimisticTier: (t: "free" | "vip") => void;
};

const C = createContext<Ctx>({
  entitlements: null,
  loading: true,
  setOptimisticTier: () => {},
});

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const supabase = getSupabase();
  const [ent, setEnt] = useState<Ent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let channel: any = null;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Read from profiles table directly since it has the subscription tier
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier, is_premium, subscription_ends_at, stripe_subscription_id, subscription_cancel_at_period_end")
        .eq("user_id", user.id)
        .maybeSingle();

      if (mounted) {
        const tier = (profile?.subscription_tier === 'vip' || profile?.is_premium) ? 'vip' : 'free';
        const isVip = tier === 'vip';
        
        setEnt({
          user_id: user.id,
          tier: tier,
          cadence: "monthly", // Default, can be enhanced later
          status: profile?.stripe_subscription_id ? "active" : "canceled",
          cancel_at_period_end: profile?.subscription_cancel_at_period_end || false,
          current_period_end: profile?.subscription_ends_at || null,
          is_pro: isVip,
          is_vip: isVip,
        } as Ent);
        setLoading(false);
      }

      // Listen to profile changes for subscription updates
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
              .select("subscription_tier, is_premium, subscription_ends_at, stripe_subscription_id, subscription_cancel_at_period_end")
              .eq("user_id", user.id)
              .maybeSingle();
            
            if (updatedProfile && mounted) {
              const tier = (updatedProfile.subscription_tier === 'vip' || updatedProfile.is_premium) ? 'vip' : 'free';
              const isVip = tier === 'vip';
              
              setEnt({
                user_id: user.id,
                tier: tier,
                cadence: "monthly",
                status: updatedProfile.stripe_subscription_id ? "active" : "canceled",
                cancel_at_period_end: updatedProfile.subscription_cancel_at_period_end || false,
                current_period_end: updatedProfile.subscription_ends_at || null,
                is_pro: isVip,
                is_vip: isVip,
              } as any);
            }
          }
        )
        .subscribe();
    })();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const setOptimisticTier = (t: "free" | "vip") =>
    setEnt((p) =>
      p
        ? {
            ...p,
            tier: t,
            is_pro: t === "vip",
            is_vip: t === "vip",
          }
        : p
    );

  const v = useMemo(
    () => ({ entitlements: ent, loading, setOptimisticTier }),
    [ent, loading]
  );

  return <C.Provider value={v}>{children}</C.Provider>;
};

export const useEntitlements = () => useContext(C);

// Convenience hook with more user-friendly API
export const useSubscription = () => {
  const { entitlements, loading, setOptimisticTier } = useEntitlements();
  
  return {
    subscriptionTier: entitlements?.tier || 'free',
    subscriptionStatus: entitlements?.status,
    subscriptionEnd: entitlements?.current_period_end,
    billingCycle: entitlements?.cadence,
    cancelAtPeriodEnd: entitlements?.cancel_at_period_end,
    isPremium: entitlements?.is_pro || false,
    isVip: entitlements?.is_vip || false,
    isLoading: loading,
    setOptimisticTier,
  };
};
