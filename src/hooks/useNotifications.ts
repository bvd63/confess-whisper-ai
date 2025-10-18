import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getNicknameCached, primeNicknameCache } from '@/lib/nicknameCache';

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
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Batch prefetch all nicknames first
      const uniqueUserIds = [...new Set(
        (data || [])
          .map(n => n.triggered_by)
          .filter(Boolean) as string[]
      )];
      
      await Promise.all(
        uniqueUserIds.map(userId => getNicknameCached(userId))
      );

      // Load nicknames for each notification (from cache now)
      const notificationsWithNicknames = await Promise.all(
        (data || []).map(async (notif) => {
          let nickname = null;
          if (notif.triggered_by) {
            const nicknameData = await getNicknameCached(notif.triggered_by);
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
        .eq('is_read', false)
        .is('deleted_at', null);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [userId]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => {
        const notification = prev.find(n => n.id === notificationId);
        if (notification && !notification.is_read) {
          setUnreadCount(current => Math.max(0, current - 1));
        }
        return prev.filter(n => n.id !== notificationId);
      });

      // Purge from cache
      localStorage.removeItem(`notification_${notificationId}`);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, []);

  const deleteAllNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('deleted_at', null);

      if (error) throw error;

      setNotifications([]);
      setUnreadCount(0);

      // Purge all notification cache
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('notification_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error deleting all notifications:', error);
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
    deleteNotification,
    deleteAllNotifications,
    reload: loadNotifications,
  };
};
