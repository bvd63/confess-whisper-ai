import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useCachePurgeOnDelete } from './useCachePurgeOnDelete';
import { getNicknameCached, primeNicknameCache } from '@/lib/nicknameCache';
import { persistenceManager } from '@/lib/persistenceManager';
import { useUnreadCount } from './useUnreadCount';
import { logError, logWarn } from '@/lib/logger';

interface Conversation {
  id: string;
  other_user_id: string;
  other_user_nickname: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

type ConversationRow = Database['public']['Tables']['conversations']['Row'];

const parseDeletedFor = (value: ConversationRow['deleted_for']): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === 'string');
};

/**
 * Instagram-style inbox hook with realtime updates and cache cleanup
 */
export const useInbox = (userId: string | null) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { purgeConversation } = useCachePurgeOnDelete();
  const { unreadCounts, markConversationAsRead } = useUnreadCount(userId);

  const loadConversations = useCallback(async () => {
    if (!userId) return;

    // Try loading from cache first for instant display
    try {
      const cached = await persistenceManager.get<Conversation[]>(
        'conversations',
        `inbox_${userId}`,
        5 * 60 * 1000 // 5 minute TTL
      );
      if (cached && cached.length > 0) {
        setConversations(cached);
        setIsLoading(false);
      }
    } catch (error) {
      logError('Failed to load cached conversations', error as Error);
    }

    try {
      // First, get all conversation IDs for this user
      const { data: participants, error: participantsError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId);

      if (participantsError) throw participantsError;
      if (!participants || participants.length === 0) {
        setConversations([]);
        setIsLoading(false);
        return;
      }

      // Get conversation details with updated_at for sorting, excluding soft-deleted ones
      const conversationIds = participants.map(p => p.conversation_id);
      const { data: allConversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select('id, updated_at, deleted_for')
        .in('id', conversationIds)
        .order('updated_at', { ascending: false });

      if (conversationsError) throw conversationsError;

      // Filter out conversations where current user is in deleted_for array
      const conversationsData =
        allConversationsData?.filter((conv) => {
          const deletedFor = parseDeletedFor(conv.deleted_for);
          return !deletedFor.includes(userId);
        }) || [];

      // Use the ordered conversations list
      const orderedParticipants = conversationsData?.map(conv => 
        participants.find(p => p.conversation_id === conv.id)
      ).filter(Boolean) || [];

      // Get other participant via RPC to avoid RLS edge cases
      const allOtherParticipants = await Promise.all(
        orderedParticipants.map(async (p) => {
          const convId = p!.conversation_id;
          const { data: partnerId } = await supabase.rpc('get_conversation_partner', {
            conv_id: convId,
            current_user_id: userId
          });
          return { convId, otherUserId: (partnerId as string) || undefined };
        })
      );

      // Batch fetch all nicknames
      const nicknamePromises = allOtherParticipants
        .filter(p => p.otherUserId)
        .map(p => getNicknameCached(p.otherUserId!));
      await Promise.all(nicknamePromises);

      // Load details for each conversation
      const conversationDetails = await Promise.all(
        orderedParticipants.map(async (p, idx) => {
          const convId = p!.conversation_id;
          const otherUserId = allOtherParticipants[idx]?.otherUserId;

          // Get nickname from cache (already prefetched)
          let nickname = null;
          if (otherUserId) {
            nickname = await getNicknameCached(otherUserId);
          }

          // Get last message
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            id: convId,
            other_user_id: otherUserId || '',
            other_user_nickname: nickname,
            last_message: lastMsg?.content || null,
            last_message_at: lastMsg?.created_at || null,
            unread_count: unreadCounts[convId] || 0,
          };
        })
      );

      setConversations(conversationDetails);
      
      // Try to cache the conversations (non-blocking)
      try {
        await persistenceManager.set(
          'conversations',
          `inbox_${userId}`,
          conversationDetails
        );
      } catch (cacheError) {
        logWarn('Failed to cache conversations', cacheError as Error);
        // Continue - caching is optional
      }
    } catch (error) {
      logError('Error loading conversations', error as Error);
      setConversations([]); // Ensure state is set even on error
    } finally {
      setIsLoading(false);
    }
  }, [unreadCounts, userId]);

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
        
        // Clear cached conversations list
        await persistenceManager.remove('conversations', `inbox_${userId}`);
      }
    } catch (error) {
      logError('Error deleting conversation', error as Error);
      throw error;
    }
  }, [userId, purgeConversation]);

  // Update conversations when unread counts change
  useEffect(() => {
    setConversations(prev => 
      prev.map(conv => ({
        ...conv,
        unread_count: unreadCounts[conv.id] || 0
      }))
    );
  }, [unreadCounts]);

  useEffect(() => {
    loadConversations();

    // Subscribe to realtime updates for messages, participants, and conversation changes
    const messagesChannel = supabase
      .channel('inbox-messages-updates')
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

    const participantsChannel = supabase
      .channel('inbox-participants-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_participants'
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    const conversationsChannel = supabase
      .channel('inbox-conversations-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(conversationsChannel);
    };
  }, [loadConversations]);

  return {
    conversations,
    isLoading,
    reload: loadConversations,
    deleteConversation,
    markConversationAsRead,
  };
};
