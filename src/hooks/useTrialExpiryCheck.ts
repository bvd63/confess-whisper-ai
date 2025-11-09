import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { logError } from '@/lib/logger';

/**
 * Hook to periodically check if the user's trial has expired
 * Shows a toast notification when trial ends
 */
export const useTrialExpiryCheck = (userId: string | null, isOnTrial: boolean) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const hasShownExpiredToast = useRef(false);
  const wasOnTrial = useRef(isOnTrial);

  useEffect(() => {
    if (!userId) return;

    // Track if user was on trial
    if (isOnTrial) {
      wasOnTrial.current = true;
      hasShownExpiredToast.current = false;
    }

    // If user was on trial but no longer is, and we haven't shown the toast yet
    if (wasOnTrial.current && !isOnTrial && !hasShownExpiredToast.current) {
      toast({
        title: t.trial_ended_toast,
        description: t.upgrade_now,
        variant: "default",
      });
      hasShownExpiredToast.current = true;
      wasOnTrial.current = false;
    }

    // Check trial expiry every 30 seconds
    const checkTrialExpiry = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('check-trial-expiry');
        
        if (error) {
          logError('[TRIAL-EXPIRY-CHECK] Error', error);
          return;
        }

        // If trial expired, the backend already updated the profile
        // The usePremiumStatus hook will automatically pick up the change
        if (data?.trialExpired && !hasShownExpiredToast.current) {
          toast({
            title: t.trial_ended_toast,
            description: t.upgrade_now,
            variant: "default",
          });
          hasShownExpiredToast.current = true;
          wasOnTrial.current = false;
        }
      } catch (error) {
        logError('[TRIAL-EXPIRY-CHECK] Error', error as Error);
      }
    };

    // Check immediately if on trial
    if (isOnTrial) {
      checkTrialExpiry();
    }

    // Set up interval to check periodically (every 30 seconds)
    const interval = setInterval(checkTrialExpiry, 30000);

    return () => clearInterval(interval);
  }, [userId, isOnTrial, toast, t]);
};
