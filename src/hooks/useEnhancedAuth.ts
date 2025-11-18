import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { logError } from '@/lib/logger';
import { useCaptchaChallenge } from '@/contexts/CaptchaChallengeContext';

interface SessionMetadata {
  deviceId?: string;
  userAgent?: string;
  ipAddress?: string;
  stayConnected?: boolean;
}

interface EnhancedAuthSession {
  id: string;
  device_id: string | null;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
  expires_at: string;
  last_refreshed_at: string | null;
  stay_connected: boolean | null;
}

export const useEnhancedAuth = () => {
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<EnhancedAuthSession[]>([]);
  const { toast } = useToast();
  const { t } = useLanguage();
  const requestCaptchaChallenge = useCaptchaChallenge();

  const checkCaptchaRequired = async (email: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-auth?action=check-captcha-required', {
        body: { email },
      });

      if (error) throw error;
      return data?.required || false;
    } catch (error) {
      logError('Error checking CAPTCHA requirement', error as Error);
      return false;
    }
  };

  const enhancedLogin = async (
    email: string,
    password: string,
    captchaToken: string,
    sessionMetadata?: SessionMetadata
  ) => {
    setLoading(true);
    try {
      const metadata: SessionMetadata = {
        deviceId: sessionMetadata?.deviceId || generateDeviceId(),
        userAgent: navigator.userAgent,
        stayConnected: sessionMetadata?.stayConnected || false,
        ...sessionMetadata,
      };

      const { data, error } = await supabase.functions.invoke('enhanced-auth?action=enhanced-login', {
        body: {
          email,
          password,
          captchaToken,
          sessionMetadata: metadata,
        },
      });

      if (error || data?.error) {
        const errorMessage = data?.messageKey ? t[data.messageKey.replace(/\./g, '_') as keyof typeof t] as string : t.auth_invalid_credentials;
        toast({
          title: t.common_error,
          description: errorMessage,
          variant: 'destructive',
        });
        return { error: error || data?.error };
      }

      // Ensure browser auth session is set so the app recognizes the login
      if (data?.session?.access_token && data?.session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      // Store refresh token securely (custom session tracking)
      if (data.refreshToken) {
        localStorage.setItem('refresh_token', data.refreshToken);
        localStorage.setItem('device_id', metadata.deviceId!);
        localStorage.setItem('stay_signed_in', String(data.stayConnected ?? metadata.stayConnected));
        if (data.expiresAt) {
          localStorage.setItem('refresh_expires_at', data.expiresAt);
        }
      }

      toast({
        title: t.auth_login_success,
        description: t.auth_welcome_back,
      });

      return { data, error: null };
    } catch (error) {
      logError('Enhanced login error', error as Error);
      toast({
        title: t.common_error,
        description: t.common_something_went_wrong,
        variant: 'destructive',
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const listSessions = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('enhanced-auth?action=list-sessions', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setSessions(data.sessions || []);
      return { data: data.sessions, error: null };
    } catch (error) {
      logError('Error listing sessions', error as Error);
      toast({
        title: t.common_error,
        description: t.common_something_went_wrong,
        variant: 'destructive',
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('enhanced-auth?action=revoke-session', {
        body: { sessionId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: t.common_success,
        description: data.messageKey ? t[data.messageKey as keyof typeof t] as string : t.auth_session_revoked,
      });

      // Refresh sessions list
      await listSessions();

      return { success: true, error: null };
    } catch (error) {
      logError('Error revoking session', error as Error);
      toast({
        title: t.common_error,
        description: t.common_something_went_wrong,
        variant: 'destructive',
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const revokeAllSessions = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('enhanced-auth?action=revoke-all-sessions', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: t.common_success,
        description: data.messageKey ? t[data.messageKey as keyof typeof t] as string : t.auth_all_sessions_revoked,
      });

      // Clear local session data
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('device_id');
  localStorage.removeItem('refresh_expires_at');
  localStorage.removeItem('stay_signed_in');

      // Sign out
      await supabase.auth.signOut();

      return { success: true, error: null };
    } catch (error) {
      logError('Error revoking all sessions', error as Error);
      toast({
        title: t.common_error,
        description: t.common_something_went_wrong,
        variant: 'destructive',
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const rotateCurrentSession = async () => {
    setLoading(true);
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('missing_refresh_token');
      }

      const metadata: SessionMetadata = {
        deviceId: localStorage.getItem('device_id') || undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        ipAddress: undefined,
        stayConnected: localStorage.getItem('stay_signed_in') === 'true',
      };

      const executeRotation = async (attempt = 0, captchaToken?: string): Promise<any> => {
        const body: Record<string, unknown> = {
          refreshToken,
          sessionMetadata: metadata,
        };

        if (captchaToken) {
          body.captchaToken = captchaToken;
        }

        const { data, error } = await supabase.functions.invoke('enhanced-auth?action=refresh-session', {
          body,
        });

        const requiresCaptcha = data?.requiresCaptcha || data?.error === 'CAPTCHA_REQUIRED';

        if (requiresCaptcha) {
          if (attempt >= 2) {
            throw new Error('captcha_attempts_exhausted');
          }

          try {
            const challengeToken = await requestCaptchaChallenge({ reason: 'session_rotation' });
            return executeRotation(attempt + 1, challengeToken);
          } catch (challengeError) {
            throw Object.assign(new Error('captcha_challenge_dismissed'), { cause: challengeError });
          }
        }

        if (error || data?.error) {
          throw error ?? Object.assign(new Error(data?.error ?? 'rotation_failed'), { status: data?.status });
        }

        if (!data?.refreshToken) {
          throw new Error('invalid_response');
        }

        return data;
      };

      const rotationResponse = await executeRotation();

      localStorage.setItem('refresh_token', rotationResponse.refreshToken);
      if (rotationResponse.expiresAt) {
        localStorage.setItem('refresh_expires_at', rotationResponse.expiresAt);
      }
      if (typeof rotationResponse.stayConnected === 'boolean') {
        localStorage.setItem('stay_signed_in', String(rotationResponse.stayConnected));
      }

      toast({
        title: t.common_success,
        description: t.settings_sessions_rotate_success,
      });

      await listSessions();

      return { success: true, error: null };
    } catch (error) {
      logError('Error rotating session', error as Error);

      const status = (error as { status?: number }).status;
      if (status === 401 || status === 403) {
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('device_id');
        localStorage.removeItem('refresh_expires_at');
        localStorage.removeItem('stay_signed_in');
        await supabase.auth.signOut();
      }

      if ((error as Error)?.message === 'captcha_challenge_dismissed') {
        toast({
          title: t.common_error,
          description: t.auth_captcha_failed,
          variant: 'destructive',
        });
      } else {
        toast({
          title: t.common_error,
          description: t.settings_sessions_rotate_error,
          variant: 'destructive',
        });
      }
      return { error };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    sessions,
    checkCaptchaRequired,
    enhancedLogin,
    listSessions,
    revokeSession,
    revokeAllSessions,
    rotateCurrentSession,
  };
};

function generateDeviceId(): string {
  const stored = localStorage.getItem('device_id');
  if (stored) return stored;

  const newId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem('device_id', newId);
  return newId;
}
