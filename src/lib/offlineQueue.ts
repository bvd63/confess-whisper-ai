/**
 * Offline Queue Manager
 * Handles retry logic for failed operations (messages, likes, etc.)
 */

import { supabase } from '@/integrations/supabase/client';
import { persistenceManager } from './persistenceManager';
import { logDebug, logError } from '@/lib/logger';

interface QueuedOperation {
  id: string;
  type: 'message' | 'like' | 'comment' | 'follow' | 'update';
  operation: () => Promise<any>;
  data: any;
  retryCount: number;
  maxRetries: number;
  createdAt: number;
  lastRetryAt?: number;
}

class OfflineQueue {
  private queue: QueuedOperation[] = [];
  private isProcessing = false;
  private maxRetries = 3;
  private retryDelay = 2000; // 2 seconds

  async init(): Promise<void> {
    // Load queued operations from IndexedDB
    try {
      const stored = await persistenceManager.getAll<QueuedOperation>('state');
      const queuedOps = stored.filter(item => item.key.startsWith('queue_'));
      
      this.queue = queuedOps.map(item => ({
        ...item,
        operation: this.reconstructOperation(item)
      }));

      // Start processing if online
      if (navigator.onLine) {
        this.processQueue();
      }
    } catch (error) {
      logError('Failed to initialize offline queue', error as Error);
    }

    // Listen for online/offline events
    window.addEventListener('online', () => this.processQueue());
    window.addEventListener('offline', () => this.stopProcessing());
  }

  private reconstructOperation(op: any): () => Promise<any> {
    // Reconstruct the operation based on type and data
    switch (op.type) {
      case 'message':
        return async () => {
          const { data, error } = await supabase
            .from('messages')
            .insert(op.data)
            .select()
            .single();
          if (error) throw error;
          return data;
        };
      case 'like':
        return async () => {
          const { data, error } = await supabase
            .from('user_likes')
            .insert(op.data);
          if (error) throw error;
          return data;
        };
      case 'comment':
        return async () => {
          const { data, error } = await supabase
            .from('comments')
            .insert(op.data);
          if (error) throw error;
          return data;
        };
      default:
        return async () => Promise.resolve();
    }
  }

  async addOperation(
    type: QueuedOperation['type'],
    operation: () => Promise<any>,
    data: any
  ): Promise<string> {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const queuedOp: QueuedOperation = {
      id,
      type,
      operation,
      data,
      retryCount: 0,
      maxRetries: this.maxRetries,
      createdAt: Date.now()
    };

    this.queue.push(queuedOp);

    // Persist to IndexedDB
    await persistenceManager.set('state', `queue_${id}`, queuedOp);

    // Try to process immediately if online
    if (navigator.onLine && !this.isProcessing) {
      this.processQueue();
    }

    return id;
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0 || !navigator.onLine) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0 && navigator.onLine) {
      const op = this.queue[0];

      // Check if enough time has passed since last retry (exponential backoff)
      if (op.lastRetryAt) {
        const backoffMs = Math.min(1000 * Math.pow(2, op.retryCount), 30000);
        if (Date.now() - op.lastRetryAt < backoffMs) {
          // Not ready to retry yet, skip to next operation
          const skippedOp = this.queue.shift()!;
          this.queue.push(skippedOp);
          continue;
        }
      }

      try {
        // Execute the operation
        await op.operation();

        // Success - remove from queue
        this.queue.shift();
        await persistenceManager.remove('state', `queue_${op.id}`);

        logDebug(`Successfully processed queued operation: ${op.type}`);
      } catch (error) {
        logError(`Failed to process operation ${op.type}`, error as Error);

        // Increment retry count and track last retry time
        op.retryCount++;
        op.lastRetryAt = Date.now();

        if (op.retryCount >= op.maxRetries) {
          // Max retries reached - remove from queue
          logError(`Max retries reached for operation ${op.id}, removing from queue`);
          this.queue.shift();
          await persistenceManager.remove('state', `queue_${op.id}`);
        } else {
          // Move to end of queue for exponential backoff
          const failedOp = this.queue.shift()!;
          this.queue.push(failedOp);
          await persistenceManager.set('state', `queue_${op.id}`, failedOp);
        }

        // Stop processing on error (will retry on next network event)
        break;
      }
    }

    this.isProcessing = false;
  }

  private stopProcessing(): void {
    this.isProcessing = false;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  async clearQueue(): Promise<void> {
    this.queue = [];
    const stored = await persistenceManager.getAll<any>('state');
    const queuedOps = stored.filter(item => item.key.startsWith('queue_'));
    
    for (const op of queuedOps) {
      await persistenceManager.remove('state', op.key);
    }
  }
}

export const offlineQueue = new OfflineQueue();

// Initialize on import
offlineQueue.init().catch(err => {
  logError('Failed to initialize offline queue', err as Error);
});
