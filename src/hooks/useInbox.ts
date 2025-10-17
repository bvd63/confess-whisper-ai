import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCachePurgeOnDelete } from './useCachePurgeOnDelete';

interface Conversation {
  id: string;
  other_user_id: string;
  other_user_nickname: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

/**
 * Instagram-style inbox hook with realtime updates and cache cleanup
 */
export const useInbox = (userId: string | null) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { purgeConversation } = useCachePurgeOnDelete();

  const loadConversations = useCallback(async () => {
    if (!userId) return;

    try {
      const { data: participants, error } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations!inner (
            id,
            updated_at
          )
        `)
        .eq('user_id', userId)
        .order('conversations.updated_at', { ascending: false });

      if (error) throw error;

      // Load details for each conversation
      const conversationDetails = await Promise.all(
        (participants || []).map(async (p) => {
          const convId = p.conversation_id;

          // Get other participant
          const { data: otherParticipants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', convId)
            .neq('user_id', userId)
            .limit(1);

          const otherUserId = otherParticipants?.[0]?.user_id;

          // Get nickname
          let nickname = null;
          if (otherUserId) {
            const { data: nicknameData } = await supabase
              .rpc('get_user_nickname', { _target_user_id: otherUserId });
            nickname = nicknameData || null;
          }

          // Get last message
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            id: convId,
            other_user_id: otherUserId || '',
            other_user_nickname: nickname,
            last_message: lastMsg?.content || null,
            last_message_at: lastMsg?.created_at || null,
            unread_count: 0, // TODO: Implement unread tracking
          };
        })
      );

      setConversations(conversationDetails);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase.rpc('delete_conversation', {
        _conversation_id: conversationId,
        _user_id: userId!,
      });

      if (error) throw error;

      if (data) {
        // Remove from state
        setConversations(prev => prev.filter(c => c.id !== conversationId));
        
        // Purge cache
        purgeConversation(conversationId);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }, [userId, purgeConversation]);

  useEffect(() => {
    loadConversations();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('inbox-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadConversations]);

  return {
    conversations,
    isLoading,
    reload: loadConversations,
    deleteConversation,
  };
};
