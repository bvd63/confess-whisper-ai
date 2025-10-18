import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useReadReceipts } from './useReadReceipts';
import { offlineQueue } from '@/lib/offlineQueue';
import { toast } from 'sonner';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read_at: string | null;
  edited_at: string | null;
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
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId || !userId || !content.trim()) return;

    const messageData = {
      conversation_id: conversationId,
      sender_id: userId,
      content: content.trim(),
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
      is_read: false
    };

    setMessages(prev => [...prev, tempMessage]);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error) throw error;

      // Replace temp message with real one
      setMessages(prev => prev.map(m => m.id === tempId ? data : m));
    } catch (error) {
      console.error('Error sending message:', error);
      
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
          setMessages(prev => [...prev, payload.new as Message]);
          
          // Auto-mark as read if not sent by current user
          if ((payload.new as Message).sender_id !== userId) {
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
          setMessages(prev =>
            prev.map(m => m.id === (payload.new as Message).id ? payload.new as Message : m)
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
  };
};