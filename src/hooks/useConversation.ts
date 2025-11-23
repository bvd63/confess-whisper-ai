import { useState, useEffect, useCallback } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useReadReceipts } from './useReadReceipts';
import { offlineQueue } from '@/lib/offlineQueue';
import { toast } from 'sonner';
import { logError } from '@/lib/logger';

type MessageRow = Database['public']['Tables']['messages']['Row'];
interface MessageReaction {
  userId: string;
  emoji: string;
  createdAt: string;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read_at: string | null;
  edited_at: string | null;
  sent_at?: string | null;
  delivered_at?: string | null;
  seen_at?: string | null;
  reactions?: Array<{ userId: string; emoji: string; createdAt: string }>;
  client_message_id?: string | null;
}

const isMessageReaction = (reaction: unknown): reaction is MessageReaction => {
  if (typeof reaction !== 'object' || reaction === null) {
    return false;
  }

  const candidate = reaction as Partial<MessageReaction>;
  return (
    typeof candidate.userId === 'string' &&
    typeof candidate.emoji === 'string' &&
    typeof candidate.createdAt === 'string'
  );
};

const parseReactions = (value: MessageRow['reactions']): MessageReaction[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isMessageReaction);
};

const toMessage = (row: MessageRow): Message => ({
  id: row.id,
  content: row.content,
  sender_id: row.sender_id,
  created_at: row.created_at,
  read_at: row.read_at,
  edited_at: row.edited_at,
  sent_at: row.sent_at,
  delivered_at: row.delivered_at,
  seen_at: row.seen_at,
  reactions: parseReactions(row.reactions),
  client_message_id: row.client_message_id,
});

export const useConversation = (conversationId: string | null, userId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { markConversationAsRead } = useReadReceipts(conversationId, userId);

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .returns<MessageRow[]>();

      if (error) throw error;
      
      // Map database messages to our Message type with proper typing
      const typedMessages: Message[] = (data || []).map(toMessage);
      
      setMessages(typedMessages);
    } catch (error) {
      logError('Error loading messages', error as Error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId || !userId || !content.trim()) return;

    const clientMessageId = `${userId}_${Date.now()}_${Math.random()}`;
    const messageData = {
      conversation_id: conversationId,
      sender_id: userId,
      content: content.trim(),
      client_message_id: clientMessageId,
      sent_at: new Date().toISOString(),
    };

    // Optimistic update
    const tempId = `temp_${Date.now()}`;
    const tempMessage = {
      id: tempId,
      ...messageData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      read_at: null,
      edited_at: null,
      delivered_at: null,
      seen_at: null,
      reactions: [],
      is_read: false
    };

    setMessages(prev => [...prev, tempMessage]);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .returns<MessageRow[]>();

      if (error) throw error;

      const insertedMessage = data?.[0];
      if (!insertedMessage) {
        throw new Error('Message insert succeeded without returning data');
      }

      // Replace temp message with real one - map to proper type
      const typedMessage = toMessage(insertedMessage);
      setMessages(prev => prev.map(m => m.id === tempId ? typedMessage : m));
    } catch (error) {
      logError('Error sending message', error as Error);
      
      // Remove temp message
      setMessages(prev => prev.filter(m => m.id !== tempId));
      
      // Add to offline queue for retry
      if (!navigator.onLine) {
        toast.info('Message queued - will send when online');
        await offlineQueue.addOperation('message', async () => {
          const { data, error } = await supabase
            .from('messages')
            .insert(messageData)
            .select()
            .single();
          if (error) throw error;
          return data;
        }, messageData);
      } else {
        toast.error('Failed to send message');
        throw error;
      }
    }
  }, [conversationId, userId]);

  const markMessagesAsDelivered = useCallback(async (messageIds: string[]) => {
    if (messageIds.length === 0) return;

    for (const messageId of messageIds) {
      try {
        await supabase.functions.invoke('mark-message-delivered', {
          body: { messageId }
        });
      } catch (error) {
        logError('Error marking message as delivered', error as Error);
      }
    }
  }, []);

  const markMessageAsSeen = useCallback(async (messageId: string) => {
    try {
      await supabase.functions.invoke('mark-message-seen', {
        body: { messageId }
      });
    } catch (error) {
      logError('Error marking message as seen', error as Error);
    }
  }, []);

  useEffect(() => {
    loadMessages();

    if (!conversationId) return;

    // Subscribe to new messages
    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload: RealtimePostgresChangesPayload<MessageRow>) => {
          if (!payload.new) return;
          const typedMessage = toMessage(payload.new);
          setMessages(prev => [...prev, typedMessage]);
          
          // Auto-mark as read if not sent by current user
          if (typedMessage.sender_id !== userId) {
            markConversationAsRead();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload: RealtimePostgresChangesPayload<MessageRow>) => {
          if (!payload.new) return;
          const typedMessage = toMessage(payload.new);
          setMessages(prev =>
            prev.map(m => m.id === typedMessage.id ? typedMessage : m)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId, loadMessages, markConversationAsRead]);

  return {
    messages,
    isLoading,
    sendMessage,
    reload: loadMessages,
    markMessagesAsDelivered,
    markMessageAsSeen,
  };
};