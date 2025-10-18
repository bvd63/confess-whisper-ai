/**
 * Offline Queue Manager
 * Handles retry logic for failed operations (messages, likes, etc.)
 */

import { supabase } from '@/integrations/supabase/client';
import { persistenceManager } from './persistenceManager';

interface QueuedOperation {
  id: string;
  type: 'message' | 'like' | 'comment' | 'follow' | 'update';
  operation: () => Promise<any>;
  data: any;
  retryCount: number;
  maxRetries: number;
  createdAt: number;
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
      console.error('Failed to initialize offline queue:', error);
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

      try {
        // Execute the operation
        await op.operation();

        // Success - remove from queue
        this.queue.shift();
        await persistenceManager.remove('state', `queue_${op.id}`);

        console.log(`✅ Successfully processed queued operation: ${op.type}`);
      } catch (error) {
        console.error(`❌ Failed to process operation ${op.type}:`, error);

        // Increment retry count
        op.retryCount++;

        if (op.retryCount >= op.maxRetries) {
          // Max retries reached - remove from queue
          console.error(`Max retries reached for operation ${op.id}, removing from queue`);
          this.queue.shift();
          await persistenceManager.remove('state', `queue_${op.id}`);
        } else {
          // Retry later
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
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
  console.error('Failed to initialize offline queue:', err);
});
