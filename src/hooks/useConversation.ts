import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useReadReceipts } from './useReadReceipts';
import { offlineQueue } from '@/lib/offlineQueue';
import { toast } from 'sonner';
import { logError } from '@/lib/logger';
import { MESSAGE_THREAD_COLUMNS } from '@/integrations/supabase/columnSets';

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

export const useConversation = (conversationId: string | null, userId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { markConversationAsRead } = useReadReceipts(conversationId, userId);

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(MESSAGE_THREAD_COLUMNS)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Map database messages to our Message type with proper typing
      const typedMessages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        content: msg.content,
        sender_id: msg.sender_id,
        created_at: msg.created_at,
        read_at: msg.read_at,
        edited_at: msg.edited_at,
        sent_at: msg.sent_at,
        delivered_at: msg.delivered_at,
        seen_at: msg.seen_at,
        reactions: Array.isArray(msg.reactions) ? msg.reactions as Array<{ userId: string; emoji: string; createdAt: string }> : [],
        client_message_id: msg.client_message_id,
      }));
      
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
        .select(MESSAGE_THREAD_COLUMNS)
        .single();

      if (error) throw error;

      // Replace temp message with real one - map to proper type
      const typedMessage: Message = {
        id: data.id,
        content: data.content,
        sender_id: data.sender_id,
        created_at: data.created_at,
        read_at: data.read_at,
        edited_at: data.edited_at,
        sent_at: data.sent_at,
        delivered_at: data.delivered_at,
        seen_at: data.seen_at,
        reactions: Array.isArray(data.reactions) ? data.reactions as Array<{ userId: string; emoji: string; createdAt: string }> : [],
        client_message_id: data.client_message_id,
      };
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
            .select(MESSAGE_THREAD_COLUMNS)
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
        (payload) => {
          const newMsg = payload.new as any;
          const typedMessage: Message = {
            id: newMsg.id,
            content: newMsg.content,
            sender_id: newMsg.sender_id,
            created_at: newMsg.created_at,
            read_at: newMsg.read_at,
            edited_at: newMsg.edited_at,
            sent_at: newMsg.sent_at,
            delivered_at: newMsg.delivered_at,
            seen_at: newMsg.seen_at,
            reactions: Array.isArray(newMsg.reactions) ? newMsg.reactions : [],
            client_message_id: newMsg.client_message_id,
          };
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
        (payload) => {
          const updatedMsg = payload.new as any;
          const typedMessage: Message = {
            id: updatedMsg.id,
            content: updatedMsg.content,
            sender_id: updatedMsg.sender_id,
            created_at: updatedMsg.created_at,
            read_at: updatedMsg.read_at,
            edited_at: updatedMsg.edited_at,
            sent_at: updatedMsg.sent_at,
            delivered_at: updatedMsg.delivered_at,
            seen_at: updatedMsg.seen_at,
            reactions: Array.isArray(updatedMsg.reactions) ? updatedMsg.reactions : [],
            client_message_id: updatedMsg.client_message_id,
          };
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