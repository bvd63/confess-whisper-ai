import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';

export const useReadReceipts = (conversationId: string | null, userId: string | null) => {
  const markAsRead = useCallback(async (messageId: string) => {
    if (!userId || !conversationId) return;

    try {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .is('read_at', null);
    } catch (error) {
      logError('Error marking message as read', error as Error);
    }
  }, [conversationId, userId]);

  const markConversationAsRead = useCallback(async () => {
    if (!userId || !conversationId) return;

    try {
      // Update all unread messages in conversation
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .is('read_at', null);

      // Update last_read_at for participant
      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);
    } catch (error) {
      logError('Error marking conversation as read', error as Error);
    }
  }, [conversationId, userId]);

  // Auto-mark as read when viewing conversation
  useEffect(() => {
    if (conversationId && userId) {
      markConversationAsRead();
    }
  }, [conversationId, userId, markConversationAsRead]);

  return {
    markAsRead,
    markConversationAsRead,
  };
};