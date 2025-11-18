/**
 * Offline Queue Manager
 * Handles retry logic for failed operations (messages, likes, etc.)
 */

import { persistenceManager } from './persistenceManager';
import { logDebug, logError } from '@/lib/logger';
import { observability } from '@/lib/observability';

const loadSupabaseClient = async () => {
  const { getSupabaseClient } = await import('@/integrations/supabase/safeClient');
  return getSupabaseClient();
};

export type OfflineQueueScope =
  | 'messages'
  | 'notifications'
  | 'confessions'
  | 'subscriptions'
  | 'system'
  | 'generic';

export type QueuedOperationType =
  | 'message'
  | 'like'
  | 'comment'
  | 'follow'
  | 'update'
  | 'confession';

type QueuedOperationStatus = 'pending' | 'processing';

interface QueuedOperation {
  id: string;
  type: QueuedOperationType;
  scope: OfflineQueueScope;
  conflictKey?: string;
  payloadHash: string;
  operation: () => Promise<any>;
  data: any;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  lastRetryAt?: number;
  status: QueuedOperationStatus;
}

type StoredQueuedOperation = Omit<QueuedOperation, 'operation' | 'status'> & {
  status?: QueuedOperationStatus;
};

export interface EnqueueMutationOptions<T> {
  type: QueuedOperationType;
  scope?: OfflineQueueScope;
  conflictKey?: string;
  data: any;
  mutationFn: () => Promise<T>;
}

export interface EnqueueMutationResult<T> {
  status: 'sent' | 'queued';
  result?: T;
  operationId?: string;
}

export type OfflineQueueEvent =
  | {
      eventId: string;
      type: 'queued';
      operationId: string;
      scope: OfflineQueueScope;
      conflictKey?: string;
      queuedAt: string;
      totalPending: number;
    }
  | {
      eventId: string;
      type: 'synced';
      syncedAt: string;
      scope?: OfflineQueueScope;
      operationId?: string;
      totalPending: number;
    }
  | {
      eventId: string;
      type: 'dropped';
      operationId: string;
      scope: OfflineQueueScope;
      reason: 'max-retries' | 'cancelled';
      totalPending: number;
    };

export interface OfflineQueueSnapshot {
  totalPending: number;
  pendingByScope: Record<string, number>;
  lastSyncAt: string | null;
  lastEvent: OfflineQueueEvent | null;
  pendingOperations: Array<{
    id: string;
    type: QueuedOperationType;
    scope: OfflineQueueScope;
    createdAt: string;
    retryCount: number;
    conflictKey?: string;
    payloadHash: string;
  }>;
}

class OfflineQueue {
  private queue: QueuedOperation[] = [];
  private isProcessing = false;
  private maxRetries = 3;
  private listeners = new Set<(snapshot: OfflineQueueSnapshot) => void>();
  private lastSyncAt: string | null = null;
  private lastEvent: OfflineQueueEvent | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.processQueue());
      window.addEventListener('offline', () => this.stopProcessing());
    }
  }

  async init(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const stored = await persistenceManager.getAll<StoredQueuedOperation>('state');
      const queuedOps = stored.filter((item) => item.key.startsWith('queue_'));

      this.queue = queuedOps.map((item) => {
        const op = this.reconstructOperation(item as StoredQueuedOperation);
        return {
          ...item,
          scope: item.scope || this.getScopeForType(item.type),
          status: 'pending' as const,
          operation: op,
        };
      });

      if (navigator.onLine) {
        this.processQueue();
      }
    } catch (error) {
      logError('Failed to initialize offline queue', error as Error);
    }

    this.notify();
  }

  private getScopeForType(type: QueuedOperationType): OfflineQueueScope {
    switch (type) {
      case 'message':
        return 'messages';
      case 'comment':
      case 'confession':
        return 'confessions';
      case 'like':
      case 'follow':
        return 'notifications';
      case 'update':
        return 'system';
      default:
        return 'generic';
    }
  }

  private reconstructOperation(op: StoredQueuedOperation): () => Promise<any> {
    switch (op.type) {
      case 'message':
        return async () => {
          const supabase = await loadSupabaseClient();
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
          const supabase = await loadSupabaseClient();
          const { data, error } = await supabase.from('user_likes').insert(op.data);
          if (error) throw error;
          return data;
        };
      case 'comment':
        return async () => {
          const supabase = await loadSupabaseClient();
          const { data, error } = await supabase.from('comments').insert(op.data);
          if (error) throw error;
          return data;
        };
      case 'confession':
        return async () => {
          const supabase = await loadSupabaseClient();
          const { data, error } = await supabase.from('confessions').insert(op.data).select().single();
          if (error) throw error;
          return data;
        };
      case 'follow':
        return async () => {
          const supabase = await loadSupabaseClient();
          const { data, error } = await supabase.from('follows').insert(op.data).select().single();
          if (error) throw error;
          return data;
        };
      default:
        return async () => Promise.resolve();
    }
  }

  private serializeOperation(op: QueuedOperation): StoredQueuedOperation {
    const { operation, ...rest } = op;
    return rest;
  }

  private hashPayload(payload: any): string {
    try {
      const str = typeof payload === 'string' ? payload : JSON.stringify(payload ?? {});
      let hash = 0;
      for (let i = 0; i < str.length; i += 1) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
      }
      return hash.toString(16);
    } catch (error) {
      logDebug('Failed to hash payload', error as Error);
      return Math.random().toString(16).slice(2);
    }
  }

  private createEventId(): string {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private getPendingByScope(): Record<string, number> {
    return this.queue.reduce<Record<string, number>>((acc, op) => {
      const scope = op.scope || 'generic';
      acc[scope] = (acc[scope] || 0) + 1;
      return acc;
    }, {});
  }

  private notify(event?: OfflineQueueEvent) {
    if (event) {
      this.lastEvent = event;
    }

    const snapshot = this.getSnapshot();

    try {
      observability.recordMetric({
        name: 'offlineQueue_length',
        value: snapshot.totalPending,
        unit: 'count',
        tags: event && 'scope' in event ? { scope: (event as any).scope ?? 'all' } : undefined,
      });
    } catch (error) {
      logDebug('Failed to record offline queue metric', error as Error);
    }

    this.listeners.forEach((listener) => listener(snapshot));
  }

  getSnapshot(): OfflineQueueSnapshot {
    return {
      totalPending: this.queue.length,
      pendingByScope: this.getPendingByScope(),
      lastSyncAt: this.lastSyncAt,
      lastEvent: this.lastEvent,
      pendingOperations: this.getPendingOperations(),
    };
  }

  subscribe(listener: (snapshot: OfflineQueueSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  async enqueueMutation<T>(options: EnqueueMutationOptions<T>): Promise<EnqueueMutationResult<T>> {
    const scope = options.scope || this.getScopeForType(options.type);

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const result = await options.mutationFn();
        this.lastSyncAt = new Date().toISOString();
        this.notify({
          eventId: this.createEventId(),
          type: 'synced',
          syncedAt: this.lastSyncAt,
          scope,
          totalPending: this.queue.length,
        });
        return { status: 'sent', result };
      } catch (error) {
        if (navigator.onLine) {
          throw error;
        }
      }
    }

    const operationId = await this.addOperation(options.type, scope, options.data, options.conflictKey);
    return { status: 'queued', operationId };
  }

  private async addOperation(
    type: QueuedOperationType,
    scope: OfflineQueueScope,
    data: any,
    conflictKey?: string
  ): Promise<string> {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    if (conflictKey) {
      await this.removeConflictingOperations(scope, conflictKey);
    }

    const queuedOp: QueuedOperation = {
      id,
      type,
      scope,
      conflictKey,
      payloadHash: this.hashPayload(data),
      operation: this.reconstructOperation({ type, scope, data } as StoredQueuedOperation),
      data,
      retryCount: 0,
      maxRetries: this.maxRetries,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    this.queue.push(queuedOp);
    await persistenceManager.set('state', `queue_${id}`, this.serializeOperation(queuedOp));

    this.notify({
      eventId: this.createEventId(),
      type: 'queued',
      operationId: id,
      scope,
      conflictKey,
      queuedAt: queuedOp.createdAt,
      totalPending: this.queue.length,
    });

    if (typeof navigator !== 'undefined' && navigator.onLine && !this.isProcessing) {
      this.processQueue();
    }

    return id;
  }

  private async removeConflictingOperations(scope: OfflineQueueScope, conflictKey: string) {
    const remaining: QueuedOperation[] = [];
    for (const op of this.queue) {
      if (op.scope === scope && op.conflictKey === conflictKey) {
        await persistenceManager.remove('state', `queue_${op.id}`);
      } else {
        remaining.push(op);
      }
    }
    this.queue = remaining;
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0 || typeof navigator === 'undefined' || !navigator.onLine) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0 && navigator.onLine) {
      const op = this.queue[0];

      if (op.lastRetryAt) {
        const backoffMs = Math.min(1000 * Math.pow(2, op.retryCount), 30000);
        if (Date.now() - op.lastRetryAt < backoffMs) {
          const skippedOp = this.queue.shift()!;
          this.queue.push(skippedOp);
          continue;
        }
      }

      try {
        op.status = 'processing';
        await op.operation();
        this.queue.shift();
        await persistenceManager.remove('state', `queue_${op.id}`);
        this.lastSyncAt = new Date().toISOString();
        this.notify({
          eventId: this.createEventId(),
          type: 'synced',
          syncedAt: this.lastSyncAt,
          scope: op.scope,
          operationId: op.id,
          totalPending: this.queue.length,
        });
        logDebug(`Successfully processed queued operation: ${op.type}`);
      } catch (error) {
        logError(`Failed to process operation ${op.type}`, error as Error);
        op.retryCount += 1;
        op.lastRetryAt = Date.now();
        op.status = 'pending';

        if (op.retryCount >= op.maxRetries) {
          logError(`Max retries reached for operation ${op.id}, removing from queue`);
          this.queue.shift();
          await persistenceManager.remove('state', `queue_${op.id}`);
          this.notify({
            eventId: this.createEventId(),
            type: 'dropped',
            operationId: op.id,
            scope: op.scope,
            reason: 'max-retries',
            totalPending: this.queue.length,
          });
        } else {
          const failedOp = this.queue.shift()!;
          this.queue.push(failedOp);
          await persistenceManager.set('state', `queue_${op.id}`, this.serializeOperation(failedOp));
        }

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

  getPendingOperations() {
    return this.queue.map((op) => ({
      id: op.id,
      type: op.type,
      scope: op.scope,
      createdAt: op.createdAt,
      retryCount: op.retryCount,
      conflictKey: op.conflictKey,
      payloadHash: op.payloadHash,
    }));
  }

  async cancelOperation(operationId: string) {
    const target = this.queue.find((op) => op.id === operationId);
    this.queue = this.queue.filter((op) => op.id !== operationId);
    await persistenceManager.remove('state', `queue_${operationId}`);
    this.notify({
      eventId: this.createEventId(),
      type: 'dropped',
      operationId,
      scope: target?.scope ?? 'generic',
      reason: 'cancelled',
      totalPending: this.queue.length,
    });
  }

  async clearQueue(): Promise<void> {
    this.queue = [];
    const stored = await persistenceManager.getAll<any>('state');
    const queuedOps = stored.filter((item) => item.key.startsWith('queue_'));

    for (const op of queuedOps) {
      await persistenceManager.remove('state', op.key);
    }

    this.notify({
      eventId: this.createEventId(),
      type: 'synced',
      syncedAt: new Date().toISOString(),
      totalPending: 0,
    });
  }
}

export const offlineQueue = new OfflineQueue();

if (typeof window !== 'undefined') {
  offlineQueue.init().catch((err) => {
    logError('Failed to initialize offline queue', err as Error);
  });
}

