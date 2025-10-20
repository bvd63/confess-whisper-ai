import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface DeviceInfo {
  deviceId: string;
  userAgent: string;
  platform: string;
  timestamp: string;
}

/**
 * Track device logins and notify user of new device access
 */
export const useDeviceTracking = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [currentDeviceId] = useState(() => getOrCreateDeviceId());

  useEffect(() => {
    const checkDeviceLogin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if this device has logged in before
      const lastDeviceId = localStorage.getItem('last_device_id');
      const isNewDevice = lastDeviceId !== currentDeviceId;

      if (isNewDevice) {
        // Log new device login
        await supabase.rpc('log_security_event', {
          _user_id: user.id,
          _event_type: 'new_device_login',
          _event_data: {
            deviceId: currentDeviceId,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
          },
        });

        // Store current device
        localStorage.setItem('last_device_id', currentDeviceId);

        // Show notification (optional - could be annoying on first login)
        if (lastDeviceId) {
          toast({
            title: "New Device Login",
            description: "You've logged in from a new device. If this wasn't you, please change your password immediately.",
            duration: 8000,
          });
        }
      }
    };

    // Check on mount and when auth state changes
    checkDeviceLogin();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        checkDeviceLogin();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [currentDeviceId, toast, t]);
};

/**
 * Generate or retrieve persistent device ID
 */
function getOrCreateDeviceId(): string {
  const stored = localStorage.getItem('device_id');
  if (stored) return stored;

  const newId = generateDeviceId();
  localStorage.setItem('device_id', newId);
  return newId;
}

/**
 * Generate a unique device ID based on browser fingerprint
 */
function generateDeviceId(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const txt = 'device_fingerprint';
  
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText(txt, 2, 2);
  }

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
  ].join('|');

  // Simple hash
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return Math.abs(hash).toString(36);
}
