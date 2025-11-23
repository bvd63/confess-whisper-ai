import { useCallback } from 'react';
import { logCache } from '@/lib/logger';

/**
 * Cache cleanup hook for immediate purge after delete operations
 * Ensures zero residual cache after deletion of confessions, comments, messages, conversations
 */
type WindowWithGc = Window & { gc?: () => void };

export const useCachePurgeOnDelete = () => {
  const purgeConfession = useCallback((confessionId: string) => {
    // Clear from localStorage
    const cachedKeys = Object.keys(localStorage).filter(key => 
      key.includes('confession') && key.includes(confessionId)
    );
    cachedKeys.forEach(key => localStorage.removeItem(key));

    // Clear from sessionStorage
    const sessionKeys = Object.keys(sessionStorage).filter(key => 
      key.includes('confession') && key.includes(confessionId)
    );
    sessionKeys.forEach(key => sessionStorage.removeItem(key));

    // Trigger garbage collection hint
    if (typeof window !== 'undefined' && 'gc' in window) {
      (window as WindowWithGc).gc?.();
    }

    logCache('purge', `confession-${confessionId}`, true);
  }, []);

  const purgeComment = useCallback((commentId: string, confessionId: string) => {
    // Clear comment cache
    const cachedKeys = Object.keys(localStorage).filter(key => 
      key.includes('comment') && (key.includes(commentId) || key.includes(confessionId))
    );
    cachedKeys.forEach(key => localStorage.removeItem(key));

    const sessionKeys = Object.keys(sessionStorage).filter(key => 
      key.includes('comment') && (key.includes(commentId) || key.includes(confessionId))
    );
    sessionKeys.forEach(key => sessionStorage.removeItem(key));

    logCache('purge', `comment-${commentId}`, true);
  }, []);

  const purgeMessage = useCallback((messageId: string, conversationId: string) => {
    // Clear message cache
    const cachedKeys = Object.keys(localStorage).filter(key => 
      key.includes('message') && (key.includes(messageId) || key.includes(conversationId))
    );
    cachedKeys.forEach(key => localStorage.removeItem(key));

    const sessionKeys = Object.keys(sessionStorage).filter(key => 
      key.includes('message') && (key.includes(messageId) || key.includes(conversationId))
    );
    sessionKeys.forEach(key => sessionStorage.removeItem(key));

    logCache('purge', `message-${messageId}`, true);
  }, []);

  const purgeConversation = useCallback((conversationId: string) => {
    // Clear entire conversation cache
    const cachedKeys = Object.keys(localStorage).filter(key => 
      key.includes('conversation') && key.includes(conversationId)
    );
    cachedKeys.forEach(key => localStorage.removeItem(key));

    const sessionKeys = Object.keys(sessionStorage).filter(key => 
      key.includes('conversation') && key.includes(conversationId)
    );
    sessionKeys.forEach(key => sessionStorage.removeItem(key));

    // Clear related messages
    const messageKeys = Object.keys(localStorage).filter(key => 
      key.includes('message') && key.includes(conversationId)
    );
    messageKeys.forEach(key => localStorage.removeItem(key));

    logCache('purge', `conversation-${conversationId}`, true);
  }, []);

  const purgeAll = useCallback(() => {
    // Nuclear option - clear all app cache
    const appKeys = Object.keys(localStorage).filter(key => 
      key.includes('confession') || 
      key.includes('comment') || 
      key.includes('message') || 
      key.includes('conversation')
    );
    appKeys.forEach(key => localStorage.removeItem(key));

    const sessionKeys = Object.keys(sessionStorage).filter(key => 
      key.includes('confession') || 
      key.includes('comment') || 
      key.includes('message') || 
      key.includes('conversation')
    );
    sessionKeys.forEach(key => sessionStorage.removeItem(key));

    logCache('purge', 'all-cache', true);
  }, []);

  return {
    purgeConfession,
    purgeComment,
    purgeMessage,
    purgeConversation,
    purgeAll,
  };
};
