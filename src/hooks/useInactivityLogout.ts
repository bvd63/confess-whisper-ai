import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface UseInactivityLogoutOptions {
  enabled: boolean; // false if "stay logged in" is checked
  inactivityTimeout?: number; // milliseconds, default 30 minutes
}

/**
 * Auto-logout after inactivity period if user didn't check "stay logged in"
 */
export const useInactivityLogout = ({ 
  enabled, 
  inactivityTimeout = 30 * 60 * 1000 // 30 minutes
}: UseInactivityLogoutOptions) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    const resetTimer = () => {
      lastActivityRef.current = Date.now();
      
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(async () => {
        const inactiveTime = Date.now() - lastActivityRef.current;
        
        if (inactiveTime >= inactivityTimeout) {
          // Auto-logout
          await supabase.auth.signOut();
          
          toast({
            title: t.auth_error,
            description: "Session expired due to inactivity",
            variant: "destructive",
          });
        }
      }, inactivityTimeout);
    };

    // Events that indicate user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    // Reset timer on any user activity
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Initial timer
    resetTimer();

    return () => {
      // Cleanup
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [enabled, inactivityTimeout, toast, t]);
};
