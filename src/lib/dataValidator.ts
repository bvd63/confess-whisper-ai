/**
 * Data validation and consistency checks for persistence
 * Ensures data integrity across local and server storage
 */

import { persistenceManager } from './persistenceManager';
import { supabase } from '@/integrations/supabase/client';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

class DataValidator {
  /**
   * Validate conversation data consistency
   */
  async validateConversation(conversationId: string, userId: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if conversation exists on server
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .single();

      if (convError || !conversation) {
        errors.push(`Conversation ${conversationId} not found on server`);
        return { isValid: false, errors, warnings };
      }

      // Check if user is participant
      const { data: participant, error: partError } = await supabase
        .from('conversation_participants')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .single();

      if (partError || !participant) {
        errors.push(`User ${userId} is not a participant in conversation ${conversationId}`);
        return { isValid: false, errors, warnings };
      }

      // Check local cache consistency
      const cachedConversations = await persistenceManager.get<any[]>(
        'conversations',
        `inbox_${userId}`
      );

      if (cachedConversations) {
        const cached = cachedConversations.find(c => c.id === conversationId);
        if (!cached) {
          warnings.push(`Conversation ${conversationId} exists on server but not in cache`);
        }
      }

      return { isValid: errors.length === 0, errors, warnings };
    } catch (error) {
      errors.push(`Validation error: ${error}`);
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Validate message data
   */
  async validateMessage(messageId: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const { data: message, error } = await supabase
        .from('messages')
        .select('*')
        .eq('id', messageId)
        .single();

      if (error || !message) {
        errors.push(`Message ${messageId} not found`);
        return { isValid: false, errors, warnings };
      }

      // Validate required fields
      if (!message.conversation_id) {
        errors.push('Message missing conversation_id');
      }
      if (!message.sender_id) {
        errors.push('Message missing sender_id');
      }
      if (!message.content || message.content.trim() === '') {
        warnings.push('Message has empty content');
      }

      return { isValid: errors.length === 0, errors, warnings };
    } catch (error) {
      errors.push(`Validation error: ${error}`);
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Check cache health and consistency
   */
  async checkCacheHealth(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check IndexedDB availability
      if (!window.indexedDB) {
        errors.push('IndexedDB not available');
        return { isValid: false, errors, warnings };
      }

      // Check cache size
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 0;
        
        const usagePercent = (usage / quota) * 100;
        
        if (usagePercent > 90) {
          errors.push(`Cache usage critical: ${usagePercent.toFixed(1)}%`);
        } else if (usagePercent > 75) {
          warnings.push(`Cache usage high: ${usagePercent.toFixed(1)}%`);
        }
      }

      return { isValid: errors.length === 0, errors, warnings };
    } catch (error) {
      errors.push(`Cache health check failed: ${error}`);
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Fix common data inconsistencies
   */
  async repairData(userId: string): Promise<void> {
    console.log('🔧 Starting data repair...');

    try {
      // Clear expired cache entries
      await persistenceManager.clearExpiredData();

      // Refresh conversation cache
      await persistenceManager.remove('conversations', `inbox_${userId}`);

      // Clear stale drafts (older than 7 days)
      const drafts = await persistenceManager.getAll('drafts');
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      
      for (const draft of drafts) {
        const draftData = await persistenceManager.get<any>('drafts', draft.key);
        if (draftData && draftData.timestamp && draftData.timestamp < weekAgo) {
          await persistenceManager.remove('drafts', draft.key);
        }
      }

      console.log('✅ Data repair completed');
    } catch (error) {
      console.error('❌ Data repair failed:', error);
      throw error;
    }
  }
}

export const dataValidator = new DataValidator();
