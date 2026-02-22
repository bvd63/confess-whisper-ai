import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Hook to show a trial-ended toast when trial state flips to inactive.
 * Backend expiry reconciliation is handled by an internal scheduler/job.
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

    // Trial expiry reconciliation is performed by an internal scheduler/job
    // that calls the internal-secret-protected endpoint server-side.
  }, [userId, isOnTrial, toast, t]);
};
