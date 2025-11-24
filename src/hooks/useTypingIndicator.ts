import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getNicknameCached } from '@/lib/nicknameCache';
import { logError } from '@/lib/logger';

export const useTypingIndicator = (conversationId: string | null, userId: string | null) => {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to typing status updates
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`typing-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_typing_status',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const record = payload.new as any;
            if (record.is_typing && record.user_id !== userId) {
              // Get nickname for typing user
              const nickname = await getNicknameCached(record.user_id);
              
              setTypingUsers(prev => {
                const filtered = prev.filter(id => id !== record.user_id);
                return [...filtered, nickname || 'Someone'];
              });

              // Auto-remove after 3 seconds
              setTimeout(() => {
                setTypingUsers(prev => prev.filter(id => id !== (nickname || 'Someone')));
              }, 3000);
            } else if (!record.is_typing) {
              const nickname = await getNicknameCached(record.user_id);
              setTypingUsers(prev => prev.filter(id => id !== (nickname || 'Someone')));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId]);

  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!conversationId || !userId) return;

    try {
      await supabase
        .from('message_typing_status')
        .upsert({
          conversation_id: conversationId,
          user_id: userId,
          is_typing: isTyping,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'conversation_id,user_id'
        });

      // Auto-clear typing after 3 seconds of inactivity
      if (isTyping) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        
        timeoutRef.current = setTimeout(() => {
          setTyping(false);
        }, 3000);
      }
    } catch (error) {
      logError('Error updating typing status', error as Error);
    }
  }, [conversationId, userId]);

  const startTyping = useCallback(() => setTyping(true), [setTyping]);
  const stopTyping = useCallback(() => setTyping(false), [setTyping]);

  return {
    typingUsers,
    startTyping,
    stopTyping,
  };
};