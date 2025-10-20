import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

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
}

export const useEnhancedAuth = () => {
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<EnhancedAuthSession[]>([]);
  const { toast } = useToast();
  const { t } = useLanguage();

  const checkCaptchaRequired = async (email: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-auth?action=check-captcha-required', {
        body: { email },
      });

      if (error) throw error;
      return data?.required || false;
    } catch (error) {
      console.error('Error checking CAPTCHA requirement:', error);
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

      const { data, error } = await supabase.functions.invoke('enhanced-auth', {
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

      // Store refresh token securely
      if (data.refreshToken) {
        localStorage.setItem('refresh_token', data.refreshToken);
        localStorage.setItem('device_id', metadata.deviceId!);
        localStorage.setItem('stay_signed_in', String(metadata.stayConnected));
      }

      toast({
        title: t.auth_login_success,
        description: t.auth_welcome_back,
      });

      return { data, error: null };
    } catch (error) {
      console.error('Enhanced login error:', error);
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
      console.error('Error listing sessions:', error);
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
      console.error('Error revoking session:', error);
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

      // Sign out
      await supabase.auth.signOut();

      return { success: true, error: null };
    } catch (error) {
      console.error('Error revoking all sessions:', error);
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

  return {
    loading,
    sessions,
    checkCaptchaRequired,
    enhancedLogin,
    listSessions,
    revokeSession,
    revokeAllSessions,
  };
};

function generateDeviceId(): string {
  const stored = localStorage.getItem('device_id');
  if (stored) return stored;

  const newId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem('device_id', newId);
  return newId;
}
