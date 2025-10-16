import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useSubscriptionCheck = (userId: string | undefined) => {
  const { toast } = useToast();

  const checkSubscription = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');

      if (error) {
        console.error('Error checking subscription:', error);
        return;
      }

      if (data) {
        console.log('Subscription status updated:', data);
      }
    } catch (error) {
      console.error('Error in subscription check:', error);
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
