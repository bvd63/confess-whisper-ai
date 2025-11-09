/**
 * Sync Scheduler
 * Manages periodic background sync operations
 */

import { supabase } from '@/integrations/supabase/client';
import { offlineQueue } from './offlineQueue';
import { persistenceManager } from './persistenceManager';
import { logInfo, logWarn, logError } from '@/lib/logger';

class SyncScheduler {
  private syncIntervals: Map<string, number> = new Map();
  private isSyncing = false;

  /**
   * Start periodic sync operations
   */
  startPeriodicSync(userId: string) {
    // Stop any existing sync
    this.stopPeriodicSync();

    // Quick sync every 30 seconds when online
    const quickSyncId = window.setInterval(async () => {
      if (navigator.onLine && !this.isSyncing) {
        await this.quickSync(userId);
      }
    }, 30000);
    this.syncIntervals.set('quick', quickSyncId);

    // Deep sync every 5 minutes
    const deepSyncId = window.setInterval(async () => {
      if (navigator.onLine && !this.isSyncing) {
        await this.deepSync(userId);
      }
    }, 5 * 60 * 1000);
    this.syncIntervals.set('deep', deepSyncId);

    // Cleanup old cache every hour
    const cleanupId = window.setInterval(async () => {
      await persistenceManager.clearExpiredData();
    }, 60 * 60 * 1000);
    this.syncIntervals.set('cleanup', cleanupId);

    logInfo('📅 Sync scheduler started');
  }

  /**
   * Stop all periodic sync operations
   */
  stopPeriodicSync() {
    this.syncIntervals.forEach((id) => {
      window.clearInterval(id);
    });
    this.syncIntervals.clear();
    logInfo('⏹️ Sync scheduler stopped');
  }

  /**
   * Quick sync - process offline queue and refresh critical data
   */
  private async quickSync(userId: string): Promise<void> {
    if (this.isSyncing) return;
    
    this.isSyncing = true;

    try {
      // Process offline queue
      await offlineQueue.processQueue();

      // Refresh unread counts
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        window.dispatchEvent(new CustomEvent('quick-sync', { detail: { userId } }));
      }
    } catch (error) {
      logError('Quick sync failed', error instanceof Error ? error : undefined);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Deep sync - validate data and call server-side sync
   */
  private async deepSync(userId: string): Promise<void> {
    if (this.isSyncing) return;

    this.isSyncing = true;

    try {
      // Call server-side sync function for data validation
      const { data, error } = await supabase.functions.invoke('sync-user-data', {
        body: { userId, operation: 'validate-data' }
      });

      if (error) {
        logError('Deep sync validation failed', error instanceof Error ? error : undefined);
      } else if (data?.result?.issues?.length > 0) {
        logWarn('⚠️ Data validation issues found', { issues: data.result.issues });
        
        // Trigger data repair
        window.dispatchEvent(new CustomEvent('data-validation-issues', {
          detail: { issues: data.result.issues }
        }));
      } else {
        logInfo('✅ Data validation passed');
      }

      // Recalculate unread counts
      const { data: countsData } = await supabase.functions.invoke('sync-user-data', {
        body: { userId, operation: 'recalculate-unread' }
      });

      if (countsData?.result?.counts) {
        await persistenceManager.set('state', `unread_counts_${userId}`, countsData.result.counts);
      }
    } catch (error) {
      logError('Deep sync failed', error instanceof Error ? error : undefined);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Force immediate sync
   */
  async forceSync(userId: string): Promise<void> {
    logInfo('🔄 Force sync initiated');
    await this.quickSync(userId);
    await this.deepSync(userId);
  }

  /**
   * Check if sync is currently running
   */
  isSyncRunning(): boolean {
    return this.isSyncing;
  }
}

export const syncScheduler = new SyncScheduler();
