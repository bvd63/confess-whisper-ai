import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SearchFilters } from "@/components/SearchBar";
import { logError } from "@/lib/logger";
import { CONFESSION_FEED_COLUMNS } from "@/integrations/supabase/columnSets";

export const useConfessionSearch = () => {
  const [confessions, setConfessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const search = useCallback(async (query: string, filters: SearchFilters) => {
    setLoading(true);
    setHasSearched(true);

    try {
      let queryBuilder = supabase
        .from('confessions')
        .select(CONFESSION_FEED_COLUMNS)
        .eq('is_draft', false);

      // Text search
      if (query.trim()) {
        queryBuilder = queryBuilder.ilike('content', `%${query}%`);
      }

      // Category filter
      if (filters.category) {
        queryBuilder = queryBuilder.eq('category', filters.category);
      }

      // Time range filter
      if (filters.timeRange && filters.timeRange !== 'all') {
        const now = new Date();
        const startDate = new Date();

        switch (filters.timeRange) {
          case 'today':
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
        }

        queryBuilder = queryBuilder.gte('created_at', startDate.toISOString());
      }

      // Sorting
      switch (filters.sortBy) {
        case 'recent':
          queryBuilder = queryBuilder.order('created_at', { ascending: false });
          break;
        case 'popular':
          queryBuilder = queryBuilder.order('likes_count', { ascending: false });
          break;
        case 'trending':
          // For trending, we'll use a view that calculates trending score
          const { data: trendingData, error: trendingError } = await supabase
            .from('trending_confessions')
            .select(CONFESSION_FEED_COLUMNS)
            .limit(50);

          if (!trendingError && trendingData) {
            // Apply same filters to trending results
            let filteredData = trendingData;
            
            if (query.trim()) {
              filteredData = filteredData.filter(c => 
                c.content.toLowerCase().includes(query.toLowerCase())
              );
            }
            
            if (filters.category) {
              filteredData = filteredData.filter(c => c.category === filters.category);
            }

            setConfessions(filteredData);
            setLoading(false);
            return;
          }
          break;
      }

      queryBuilder = queryBuilder.limit(50);

      const { data, error } = await queryBuilder;

      if (error) throw error;

      setConfessions(data || []);
    } catch (error) {
      logError('Error searching confessions', error as Error);
      setConfessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setConfessions([]);
    setHasSearched(false);
  }, []);

  return {
    confessions,
    loading,
    hasSearched,
    search,
    clear,
  };
};
