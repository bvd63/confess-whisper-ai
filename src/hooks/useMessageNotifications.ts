import { useEffect, useRef } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { logDebug } from '@/lib/logger';

type NotificationRow = Database['public']['Tables']['notifications']['Row'];

interface UseMessageNotificationsProps {
  userId: string | undefined;
  enabled?: boolean;
}

export const useMessageNotifications = ({ userId, enabled = true }: UseMessageNotificationsProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasPermission = useRef(false);
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        hasPermission.current = permission === 'granted';
      });
    } else if ('Notification' in window) {
      hasPermission.current = Notification.permission === 'granted';
    }

    // Note: Audio notification sound is optional - will fail silently if file doesn't exist
    try {
      audioRef.current = new Audio('/notification.mp3');
    } catch (e) {
      logDebug('Notification sound not available');
    }
  }, []);

  useEffect(() => {
    if (!userId || !enabled) return;

    const channel = supabase
      .channel('message-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        async (payload: RealtimePostgresChangesPayload<NotificationRow>) => {
          const notification = payload.new;
          if (!notification) return;
          
          // Only handle message notifications (type 'comment' is used for messages)
          if (notification.type !== 'comment') return;

          // Get sender's nickname
          const { data: profile } = await supabase
            .from('profiles')
            .select('nickname')
            .eq('user_id', notification.triggered_by)
            .single();

          const senderNickname = profile?.nickname || t.anonymous_user;
          const messagePreview = notification.comment_content?.substring(0, 50) || t.notification_message_new;

          // Show in-app toast notification
          toast.info(`${senderNickname}: ${messagePreview}`, {
            action: {
              label: t.notification_view,
              onClick: () => {
                navigate(`/messages?user=${notification.triggered_by}`);
              }
            }
          });

          // Play notification sound
          if (audioRef.current) {
            audioRef.current.play().catch(e => logDebug('Could not play notification sound', { error: e }));
          }

          // Show browser notification
          if (hasPermission.current && document.hidden) {
            new Notification(`${senderNickname}`, {
              body: messagePreview,
              icon: '/favicon.ico',
              tag: 'message-notification',
              requireInteraction: false
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, navigate, t.anonymous_user, t.notification_message_new, t.notification_view, userId]);
};
