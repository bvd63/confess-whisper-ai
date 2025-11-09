import { useState, useEffect, useCallback } from 'react';
import { persistenceManager } from '@/lib/persistenceManager';
import { logError } from '@/lib/logger';

/**
 * Hook for persisting state across sessions
 * Similar to useState but automatically syncs with IndexedDB
 */
export const usePersistedState = <T>(
  key: string,
  initialValue: T,
  store: string = 'state'
): [T, (value: T | ((prev: T) => T)) => void, () => void] => {
  const [state, setState] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load initial value from persistence
  useEffect(() => {
    const loadState = async () => {
      try {
        const stored = await persistenceManager.get<T>(store, key);
        if (stored !== null) {
          setState(stored);
        }
        setIsLoaded(true);
      } catch (error) {
        logError(`Failed to load persisted state for ${key}`, error as Error);
        setIsLoaded(true);
      }
    };

    loadState();
  }, [key, store]);

  // Persist state changes
  const setPersistedState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState(prev => {
        const newValue = value instanceof Function ? value(prev) : value;
        
        // Persist asynchronously
        persistenceManager.set(store, key, newValue).catch(error => {
          logError(`Failed to persist state for ${key}`, error as Error);
        });

        return newValue;
      });
    },
    [key, store]
  );

  // Clear persisted state
  const clearPersistedState = useCallback(() => {
    setState(initialValue);
    persistenceManager.remove(store, key).catch(error => {
      logError(`Failed to clear persisted state for ${key}`, error as Error);
    });
  }, [key, store, initialValue]);

  return [state, setPersistedState, clearPersistedState];
};
