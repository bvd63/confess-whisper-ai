import { useState, useEffect } from 'react';

const RECENT_SEARCHES_KEY = 'recent-searches';
const MAX_RECENT = 5;

export function useSearchSuggestions() {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingSearches] = useState<string[]>([
    'depression',
    'anxiety',
    'relationships',
    'work stress',
    'family problems',
  ]);

  useEffect(() => {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse recent searches:', e);
      }
    }
  }, []);

  const addRecentSearch = (query: string) => {
    if (!query.trim()) return;
    
    const updated = [
      query,
      ...recentSearches.filter(s => s !== query)
    ].slice(0, MAX_RECENT);
    
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  return {
    recentSearches,
    trendingSearches,
    addRecentSearch,
    clearRecentSearches,
  };
}
