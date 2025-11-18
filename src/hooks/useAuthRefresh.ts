import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { observability } from '@/lib/observability';
import { useCaptchaChallenge } from '@/contexts/CaptchaChallengeContext';

/**
 * Automatic JWT token refresh hook
 * Ensures tokens are refreshed before expiry
 */
export const useAuthRefresh = () => {
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();
  const requestCaptchaChallenge = useCaptchaChallenge();

  useEffect(() => {
    interface RotateOptions {
      captchaToken?: string;
      attempt?: number;
    }

    const rotateManagedRefreshToken = async (options: RotateOptions = {}) => {
      const storedToken = localStorage.getItem('refresh_token');
      if (!storedToken) {
        return;
      }

      try {
        const deviceId = localStorage.getItem('device_id') || undefined;
        const stayConnected = localStorage.getItem('stay_signed_in') === 'true';

        const requestBody: Record<string, unknown> = {
          refreshToken: storedToken,
          sessionMetadata: {
            deviceId,
            userAgent: navigator.userAgent,
            stayConnected,
          },
        };

        if (options.captchaToken) {
          requestBody.captchaToken = options.captchaToken;
        }

        const { data, error } = await supabase.functions.invoke('enhanced-auth?action=refresh-session', {
          body: {
            ...requestBody,
          },
        });

        const requiresCaptcha = data?.requiresCaptcha || data?.error === 'CAPTCHA_REQUIRED';

        if (requiresCaptcha) {
          if ((options.attempt ?? 0) >= 2) {
            observability.warn('Refresh captcha attempts exhausted');
            return;
          }

          try {
            const captchaResponse = await requestCaptchaChallenge({ reason: 'auth_refresh' });
            await rotateManagedRefreshToken({ captchaToken: captchaResponse, attempt: (options.attempt ?? 0) + 1 });
          } catch (challengeError) {
            observability.warn('Refresh captcha challenge dismissed', challengeError instanceof Error ? challengeError : undefined);
          }
          return;
        }

        if (error || data?.error) {
          observability.warn('Managed refresh rotation failed', {
            metadata: {
              supabaseError: error?.message,
              edgeError: data?.error,
            },
          });

          if (data?.error === 'REFRESH_TOKEN_EXPIRED' || data?.error === 'INVALID_REFRESH_TOKEN' || data?.error === 'UNAUTHORIZED') {
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('refresh_expires_at');
            await supabase.auth.signOut();
            window.location.href = '/auth';
          }
          return;
        }

        if (data?.refreshToken) {
          localStorage.setItem('refresh_token', data.refreshToken);
        }

        if (typeof data?.stayConnected === 'boolean') {
          localStorage.setItem('stay_signed_in', String(data.stayConnected));
        }

        if (data?.expiresAt) {
          localStorage.setItem('refresh_expires_at', data.expiresAt);
        }
      } catch (error) {
        observability.error('Refresh token rotation exception', error as Error);
      }
    };

    const setupTokenRefresh = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return;
      }

      // Calculate when to refresh (5 minutes before expiry)
      const expiresAt = session.expires_at;
      if (!expiresAt) return;

      const expiryTime = expiresAt * 1000; // Convert to ms
      const now = Date.now();
      const refreshTime = expiryTime - (5 * 60 * 1000); // 5 min before expiry
      const timeUntilRefresh = Math.max(0, refreshTime - now);

      observability.info('Token refresh scheduled', {
        metadata: {
          expiresAt: new Date(expiryTime).toISOString(),
          refreshAt: new Date(refreshTime).toISOString(),
          timeUntilRefresh,
        },
      });

      // Clear existing timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      // Schedule refresh
      refreshTimeoutRef.current = setTimeout(async () => {
        try {
          observability.info('Attempting token refresh');
          
          const { data, error } = await supabase.auth.refreshSession();
          
          if (error) {
            observability.error('Token refresh failed', error);
            // Force re-login if refresh fails
            await supabase.auth.signOut();
            window.location.href = '/auth';
          } else {
            observability.info('Token refreshed successfully', {
              metadata: {
                newExpiresAt: data.session?.expires_at 
                  ? new Date(data.session.expires_at * 1000).toISOString()
                  : 'unknown',
              },
            });

            await rotateManagedRefreshToken();
            
            // Schedule next refresh
            setupTokenRefresh();
          }
        } catch (error) {
          observability.error('Token refresh exception', error as Error);
        }
      }, timeUntilRefresh);
    };

    setupTokenRefresh();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        observability.info(`Auth event: ${event}`);
        setupTokenRefresh();
      } else if (event === 'SIGNED_OUT') {
        observability.info('User signed out, clearing refresh timeout');
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('refresh_expires_at');
        localStorage.removeItem('stay_signed_in');
      }
    });

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      subscription.unsubscribe();
    };
  }, []);
};
