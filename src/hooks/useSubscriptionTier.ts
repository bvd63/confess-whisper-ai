import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Tier = "FREE" | "VIP";

type SubscriptionTierState = {
  tier: Tier;
  status: string | null;
  loading: boolean;
  error: string | null;
};

const normalizeTier = (value: string | null | undefined): Tier => {
  return (value || "").toUpperCase() === "VIP" ? "VIP" : "FREE";
};

type ProfileFilterField = "id" | "user_id";

export const useSubscriptionTier = (enabled = true) => {
  const [state, setState] = useState<SubscriptionTierState>({
    tier: "FREE",
    status: null,
    loading: enabled,
    error: null,
  });
  const [target, setTarget] = useState<{ userId: string; field: ProfileFilterField } | null>(null);

  const fetchSubscription = useCallback(async (isInitialLoad = false) => {
    if (!enabled) {
      setTarget(null);
      setState((prev) => ({ ...prev, loading: false }));
      return null as { userId: string; field: ProfileFilterField } | null;
    }

    if (isInitialLoad) {
      setState((prev) => ({ ...prev, loading: true, error: null }));
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setTarget(null);
        setState((prev) => ({
          ...prev,
          tier: "FREE",
          status: null,
          loading: false,
          error: null,
        }));
        return null;
      }

      const userId = user.id;

      const readProfile = async (field: ProfileFilterField) => {
        const { data, error } = await supabase
          .from("profiles")
          .select("subscription_tier, subscription_status")
          .eq(field, userId)
          .maybeSingle();

        if (error) throw error;
        return data;
      };

      let field: ProfileFilterField = "id";
      let profile = await readProfile("id");

      if (!profile) {
        field = "user_id";
        profile = await readProfile("user_id");
      }

      setState((prev) => ({
        ...prev,
        tier: normalizeTier(profile?.subscription_tier),
        status: profile?.subscription_status || null,
        loading: false,
        error: null,
      }));

      const nextTarget = { userId, field };
      setTarget(nextTarget);
      return nextTarget;
    } catch (error) {
      setTarget(null);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load subscription tier",
      }));
      return null;
    }
  }, [enabled]);

  const refresh = useCallback(async () => {
    await fetchSubscription(false);
  }, [fetchSubscription]);

  useEffect(() => {
    if (!enabled) return;

    void fetchSubscription(true);

    const { data: authSubscription } = supabase.auth.onAuthStateChange(() => {
      void fetchSubscription(false);
    });

    return () => {
      authSubscription.subscription.unsubscribe();
    };
  }, [enabled, fetchSubscription]);

  useEffect(() => {
    if (!enabled || !target) return;

    const channel = supabase
      .channel(`profiles:${target.userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `${target.field}=eq.${target.userId}`,
        },
        (payload) => {
          const row = payload.new as {
            subscription_tier?: string | null;
            subscription_status?: string | null;
          };

          setState((prev) => ({
            ...prev,
            tier: normalizeTier(row.subscription_tier ?? prev.tier),
            status: row.subscription_status ?? prev.status,
            error: null,
          }));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, target]);

  return useMemo(() => {
    const isVip = state.tier === "VIP";

    return {
      tier: state.tier,
      status: state.status,
      isVip,
      loading: state.loading,
      error: state.error,
      refresh,
    };
  }, [refresh, state.error, state.loading, state.status, state.tier]);
};
