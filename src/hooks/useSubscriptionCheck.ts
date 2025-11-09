import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";

export const useSubscriptionCheck = (userId: string | undefined) => {
  const checkSubscription = useCallback(async () => {
    if (!userId) return null;

    try {
      // 1) Trigger backend verification against Stripe (updates profiles table)
      try {
        await supabase.functions.invoke('check-subscription');
      } catch (fnErr) {
        logError('Error invoking check-subscription function', fnErr as Error);
      }

      // 2) Read current entitlements (if table exists)
      const { data: entitlement, error } = await supabase
        .from('subscription_entitlements')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        logError('Error checking subscription entitlements', error);
        return null;
      }

      return entitlement;
    } catch (error) {
      logError('Error in subscription check', error as Error);
      return null;
    }
  }, [userId]);

  // Check on mount and when userId changes
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Check every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      checkSubscription();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkSubscription]);

  return { checkSubscription };
};
