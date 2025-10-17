import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseMessageNotificationsProps {
  userId: string | undefined;
  enabled?: boolean;
}

export const useMessageNotifications = ({ userId, enabled = true }: UseMessageNotificationsProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasPermission = useRef(false);

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
      console.log('Notification sound not available');
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
        async (payload: any) => {
          const notification = payload.new;
          
          // Only handle message notifications (type 'comment' is used for messages)
          if (notification.type !== 'comment') return;

          // Get sender's nickname
          const { data: profile } = await supabase
            .from('profiles')
            .select('nickname')
            .eq('user_id', notification.triggered_by)
            .single();

          const senderNickname = profile?.nickname || 'Someone';
          const messagePreview = notification.comment_content?.substring(0, 50) || 'New message';

          // Show in-app toast notification
          toast.info(`${senderNickname}: ${messagePreview}`, {
            action: {
              label: 'View',
              onClick: () => {
                window.location.href = `/messages?user=${notification.triggered_by}`;
              }
            }
          });

          // Play notification sound
          if (audioRef.current) {
            audioRef.current.play().catch(e => console.log('Could not play sound:', e));
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
  }, [userId, enabled]);
};
