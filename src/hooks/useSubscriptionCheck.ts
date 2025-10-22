import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useSubscriptionCheck = (userId: string | undefined) => {
  const checkSubscription = useCallback(async () => {
    if (!userId) return null;

    try {
      // Check entitlements from database
      const { data: entitlement, error } = await supabase
        .from('subscription_entitlements')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        console.error('Error checking subscription entitlements:', error);
        return null;
      }

      return entitlement;
    } catch (error) {
      console.error('Error in subscription check:', error);
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
