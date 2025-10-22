import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTranslation } from '@/i18n/translations';

/**
 * Hook to check for recent subscription conflicts and notify user
 * Checks once on mount if user recently had a conflict resolved
 */
export const useSubscriptionConflictCheck = (userId?: string) => {
  const { toast } = useToast();
  const { language } = useLanguage();

  useEffect(() => {
    if (!userId) return;

    const checkForRecentConflicts = async () => {
      try {
        // Check for conflicts in the last 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        
        const { data: conflicts, error } = await supabase
          .from('subscription_conflict_logs')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', fiveMinutesAgo)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error checking subscription conflicts:', error);
          return;
        }

        if (conflicts && conflicts.length > 0) {
          const latestConflict = conflicts[0];
          
          // Show appropriate toast based on conflict type
          if (latestConflict.conflict_type === 'KEEP_NEW') {
            toast({
              title: "Subscription Updated",
              description: getTranslation('subscription_conflict_resolved_keep_new', language),
              duration: 8000,
            });
          } else if (latestConflict.conflict_type === 'KEEP_OLD') {
            toast({
              title: "Subscription Unchanged",
              description: getTranslation('subscription_conflict_resolved_keep_old', language),
              duration: 8000,
            });
          }
        }
      } catch (error) {
        console.error('Error in conflict check:', error);
      }
    };

    // Check once on mount, with a small delay to ensure user is authenticated
    const timeoutId = setTimeout(checkForRecentConflicts, 1000);

    return () => clearTimeout(timeoutId);
  }, [userId, toast, language]);
};
