import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "./useCurrentUser";
import { logInfo, logError } from "@/lib/logger";

interface TrialStatus {
  isActive: boolean;
  isExpired: boolean;
  endsAt: string | null;
  daysRemaining: number | null;
  hasUsedTrial: boolean;
}

export const useTrialStatus = () => {
  const { user } = useCurrentUser();
  const [trialStatus, setTrialStatus] = useState<TrialStatus>({
    isActive: false,
    isExpired: false,
    endsAt: null,
    daysRemaining: null,
    hasUsedTrial: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchTrialStatus = async () => {
      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("trial_active, trial_premium_ends_at, trial_used")
          .eq("user_id", user.id)
          .single();

        if (error) {
          logError("Failed to fetch trial status", { error });
          return;
        }

        const now = new Date();
        const endsAt = profile.trial_premium_ends_at 
          ? new Date(profile.trial_premium_ends_at) 
          : null;

        const isExpired = endsAt ? endsAt < now : false;
        const daysRemaining = endsAt 
          ? Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        setTrialStatus({
          isActive: profile.trial_active && !isExpired,
          isExpired,
          endsAt: profile.trial_premium_ends_at,
          daysRemaining,
          hasUsedTrial: profile.trial_used,
        });

        logInfo("Trial status fetched", { 
          isActive: profile.trial_active && !isExpired,
          daysRemaining 
        });
      } catch (error) {
        logError("Error fetching trial status", { error });
      } finally {
        setLoading(false);
      }
    };

    fetchTrialStatus();

    // Set up realtime subscription for profile changes
    const channel = supabase
      .channel("trial-status")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchTrialStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return { trialStatus, loading };
};
