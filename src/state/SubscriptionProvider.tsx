import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";

type Ent = {
  user_id: string;
  tier: "free" | "premium" | "vip";
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
  setOptimisticTier: (t: "free" | "premium" | "vip") => void;
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

      const { data } = await supabase
        .from("v_user_entitlements")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (mounted) {
        setEnt(
          data ??
            ({
              user_id: user.id,
              tier: "free",
              cadence: "monthly",
              status: "canceled",
              cancel_at_period_end: false,
              current_period_end: null,
              is_pro: false,
              is_vip: false,
            } as Ent)
        );
        setLoading(false);
      }

      channel = supabase
        .channel(`sub:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "subscriptions",
            filter: `user_id=eq.${user.id}`,
          },
          async () => {
            const { data: f } = await supabase
              .from("v_user_entitlements")
              .select("*")
              .eq("user_id", user.id)
              .maybeSingle();
            if (f && mounted) setEnt(f as any);
          }
        )
        .subscribe();
    })();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const setOptimisticTier = (t: "free" | "premium" | "vip") =>
    setEnt((p) =>
      p
        ? {
            ...p,
            tier: t,
            is_pro: t !== "free",
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
