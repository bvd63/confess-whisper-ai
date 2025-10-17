import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'message' | 'badge_earned' | 'deep_insight' | 'streak_milestone';
  triggered_by: string | null;
  triggered_by_nickname: string | null;
  confession_id: string | null;
  comment_content: string | null;
  created_at: string;
  is_read: boolean;
}

/**
 * Instagram-style notifications hook with realtime updates
 */
export const useNotifications = (userId: string | null) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Load nicknames for each notification
      const notificationsWithNicknames = await Promise.all(
        (data || []).map(async (notif) => {
          let nickname = null;
          if (notif.triggered_by) {
            const { data: nicknameData } = await supabase
              .rpc('get_user_nickname', { _target_user_id: notif.triggered_by });
            nickname = nicknameData || null;
          }

          return {
            ...notif,
            triggered_by_nickname: nickname,
          };
        })
      );

      setNotifications(notificationsWithNicknames);
      setUnreadCount(notificationsWithNicknames.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [userId]);

  useEffect(() => {
    loadNotifications();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('notifications-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadNotifications, userId]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    reload: loadNotifications,
  };
};
