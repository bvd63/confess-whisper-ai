import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useSubscriptionCheck = (userId: string | undefined) => {
  const { toast } = useToast();

  const checkSubscription = useCallback(async () => {
    if (!userId) return;

    try {
      // Use get-subscription-status instead of check-subscription for trial support
      const { data, error } = await supabase.functions.invoke('get-subscription-status');

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
    
    // Also check trial expiry
    const checkTrialExpiry = async () => {
      if (!userId) return;
      try {
        await supabase.functions.invoke('check-trial-expiry');
      } catch (error) {
        console.error('Error checking trial expiry:', error);
      }
    };
    checkTrialExpiry();
  }, [checkSubscription, userId]);

  // Check every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      checkSubscription();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkSubscription]);

  return { checkSubscription };
};
