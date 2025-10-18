import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { persistenceManager } from '@/lib/persistenceManager';

/**
 * Hook for tracking unread message counts across conversations
 */
export const useUnreadCount = (userId: string | null) => {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    if (!userId) return;

    loadUnreadCounts();

    // Subscribe to new messages
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=neq.${userId}`
        },
        (payload) => {
          // Increment unread count for this conversation
          const message = payload.new as any;
          setUnreadCounts(prev => ({
            ...prev,
            [message.conversation_id]: (prev[message.conversation_id] || 0) + 1
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `is_read=eq.true`
        },
        () => {
          // Refresh counts when messages are marked as read
          loadUnreadCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadUnreadCounts = async () => {
    if (!userId) return;

    try {
      // Try cache first
      const cached = await persistenceManager.get<Record<string, number>>(
        'state',
        `unread_counts_${userId}`,
        5 * 60 * 1000 // 5 minute TTL
      );

      if (cached) {
        setUnreadCounts(cached);
        setTotalUnread(Object.values(cached).reduce((sum, count) => sum + count, 0));
      }

      // Get user's conversations
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId);

      if (!participants) return;

      const conversationIds = participants.map(p => p.conversation_id);

      // Count unread messages per conversation
      const counts: Record<string, number> = {};
      
      await Promise.all(
        conversationIds.map(async (convId) => {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', convId)
            .eq('is_read', false)
            .neq('sender_id', userId);

          counts[convId] = count || 0;
        })
      );

      setUnreadCounts(counts);
      setTotalUnread(Object.values(counts).reduce((sum, count) => sum + count, 0));

      // Cache the counts
      await persistenceManager.set('state', `unread_counts_${userId}`, counts);
    } catch (error) {
      console.error('Error loading unread counts:', error);
    }
  };

  const markConversationAsRead = async (conversationId: string) => {
    if (!userId) return;

    try {
      // Mark all messages in conversation as read
      await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('is_read', false)
        .neq('sender_id', userId);

      // Update local state
      setUnreadCounts(prev => {
        const updated = { ...prev };
        delete updated[conversationId];
        return updated;
      });

      // Update cache
      await persistenceManager.set('state', `unread_counts_${userId}`, unreadCounts);
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  };

  return {
    unreadCounts,
    totalUnread,
    markConversationAsRead,
    refresh: loadUnreadCounts
  };
};
