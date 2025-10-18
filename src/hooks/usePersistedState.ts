import { useState, useEffect, useCallback } from 'react';
import { persistenceManager } from '@/lib/persistenceManager';

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
        console.error(`Failed to load persisted state for ${key}:`, error);
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
          console.error(`Failed to persist state for ${key}:`, error);
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
      console.error(`Failed to clear persisted state for ${key}:`, error);
    });
  }, [key, store, initialValue]);

  return [state, setPersistedState, clearPersistedState];
};
