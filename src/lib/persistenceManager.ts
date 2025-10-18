/**
 * Centralized Persistence Manager
 * Handles all local and server-side data persistence with sync capabilities
 */

import { persistenceMonitor } from './persistenceMonitor';

interface PersistenceOptions {
  ttl?: number; // Time to live in milliseconds
  syncWithServer?: boolean;
}

interface CachedItem<T> {
  data: T;
  timestamp: number;
  version: number;
}

class PersistenceManager {
  private dbName = 'confessai_storage';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create stores for different data types
        if (!db.objectStoreNames.contains('messages')) {
          db.createObjectStore('messages', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('drafts')) {
          db.createObjectStore('drafts', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('conversations')) {
          db.createObjectStore('conversations', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('state')) {
          db.createObjectStore('state', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'key' });
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  // Generic set method
  async set<T>(store: string, key: string, value: T, options: PersistenceOptions = {}): Promise<void> {
    return persistenceMonitor.trackOperation(`set:${store}:${key}`, async () => {
      const db = await this.ensureDB();
      const transaction = db.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);

      const cachedItem: CachedItem<T> = {
        data: value,
        timestamp: Date.now(),
        version: 1
      };

      return new Promise((resolve, reject) => {
        const request = objectStore.put({ key, ...cachedItem });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  }

  // Generic get method
  async get<T>(store: string, key: string, ttl?: number): Promise<T | null> {
    return persistenceMonitor.trackOperation(`get:${store}:${key}`, async () => {
      const db = await this.ensureDB();
      const transaction = db.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);

      return new Promise((resolve, reject) => {
        const request = objectStore.get(key);
        
        request.onsuccess = () => {
          const result = request.result as (CachedItem<T> & { key: string }) | undefined;
          
          if (!result) {
            resolve(null);
            return;
          }

          // Check TTL
          if (ttl && Date.now() - result.timestamp > ttl) {
            this.remove(store, key);
            resolve(null);
            return;
          }

          resolve(result.data);
        };
        
        request.onerror = () => reject(request.error);
      });
    });
  }

  // Remove item
  async remove(store: string, key: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([store], 'readwrite');
    const objectStore = transaction.objectStore(store);

    return new Promise((resolve, reject) => {
      const request = objectStore.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get all items from a store
  async getAll<T>(store: string): Promise<Array<T & { key: string }>> {
    const db = await this.ensureDB();
    const transaction = db.transaction([store], 'readonly');
    const objectStore = transaction.objectStore(store);

    return new Promise((resolve, reject) => {
      const request = objectStore.getAll();
      
      request.onsuccess = () => {
        const results = request.result as Array<CachedItem<T> & { key: string }>;
        resolve(results.map(r => ({ key: r.key, ...r.data })));
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // Clear entire store
  async clearStore(store: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([store], 'readwrite');
    const objectStore = transaction.objectStore(store);

    return new Promise((resolve, reject) => {
      const request = objectStore.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Specialized methods for common operations
  
  // Draft messages
  async saveDraft(conversationId: string, content: string): Promise<void> {
    await this.set('drafts', `draft_${conversationId}`, { content, conversationId });
  }

  async getDraft(conversationId: string): Promise<string | null> {
    const draft = await this.get<{ content: string }>('drafts', `draft_${conversationId}`);
    return draft?.content || null;
  }

  async removeDraft(conversationId: string): Promise<void> {
    await this.remove('drafts', `draft_${conversationId}`);
  }

  // UI State
  async saveScrollPosition(page: string, position: number): Promise<void> {
    await this.set('state', `scroll_${page}`, { position });
  }

  async getScrollPosition(page: string): Promise<number | null> {
    const state = await this.get<{ position: number }>('state', `scroll_${page}`);
    return state?.position || null;
  }

  // User Preferences
  async savePreference(key: string, value: any): Promise<void> {
    await this.set('preferences', key, value);
  }

  async getPreference<T>(key: string): Promise<T | null> {
    return await this.get<T>('preferences', key);
  }

  // Language preference with localStorage fallback
  async saveLanguage(lang: string): Promise<void> {
    await this.savePreference('language', lang);
    localStorage.setItem('language', lang);
  }

  async getLanguage(): Promise<string | null> {
    const lang = await this.getPreference<string>('language');
    return lang || localStorage.getItem('language');
  }

  // Clear all user data (for logout)
  async clearAllUserData(): Promise<void> {
    const stores = ['messages', 'drafts', 'conversations', 'state', 'preferences'];
    await Promise.all(stores.map(store => this.clearStore(store)));
  }

  // Clear old cached data (for performance)
  async clearExpiredData(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const now = Date.now();
    const stores = ['messages', 'conversations', 'state'];
    
    for (const storeName of stores) {
      try {
        const db = await this.ensureDB();
        const transaction = db.transaction([storeName], 'readwrite');
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.openCursor();

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const item = cursor.value as CachedItem<any> & { key: string };
            if (now - item.timestamp > maxAge) {
              cursor.delete();
            }
            cursor.continue();
          }
        };
      } catch (error) {
        console.error(`Error clearing expired data from ${storeName}:`, error);
      }
    }
  }

}

export const persistenceManager = new PersistenceManager();

// Initialize on import
persistenceManager.init().catch(err => {
  console.error('Failed to initialize persistence manager:', err);
});
