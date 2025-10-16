import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Confession {
  id: string;
  content: string;
  category: string;
  user_id?: string | null;
  comments_count?: number;
  likes_count?: number;
  ai_response?: string | null;
  ai_deep_insight?: string | null;
  created_at: string;
}

interface UseConfessionsOptions {
  sortBy?: 'recent' | 'popular';
  categoryFilter?: string;
  limit?: number;
}

export const useConfessions = ({ 
  sortBy = 'recent', 
  categoryFilter = 'all',
  limit = 20 
}: UseConfessionsOptions = {}) => {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const loadConfessions = useCallback(async (isRetry = false) => {
    if (!isRetry) {
      setIsLoading(true);
      setError(null);
      retryCountRef.current = 0;
    }
    
    try {
      let query = supabase
        .from('confessions')
        .select('*')
        .limit(limit);

      // Filter by category if not 'all'
      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      // Sort based on selected filter
      if (sortBy === 'recent') {
        query = query.order('created_at', { ascending: false });
      } else {
        query = query.order('likes_count', { ascending: false });
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;
      setConfessions(data || []);
      retryCountRef.current = 0; // Reset on success
    } catch (err) {
      console.error('Error loading confessions:', err);
      setError(err as Error);
      
      // Retry logic for network errors
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        console.log(`Retrying... (${retryCountRef.current}/${maxRetries})`);
        setTimeout(() => loadConfessions(true), 1000 * retryCountRef.current);
      }
    } finally {
      if (!isRetry || retryCountRef.current >= maxRetries) {
        setIsLoading(false);
      }
    }
  }, [sortBy, categoryFilter, limit]);

  useEffect(() => {
    loadConfessions();
  }, [loadConfessions]);

  // Set up real-time subscription with smart updates
  useEffect(() => {
    const channel = supabase
      .channel('confessions-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'confessions'
        },
        (payload) => {
          // Add new confession to the top
          setConfessions((current) => [payload.new as Confession, ...current]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'confessions'
        },
        (payload) => {
          // Update existing confession
          setConfessions((current) =>
            current.map((conf) =>
              conf.id === payload.new.id ? (payload.new as Confession) : conf
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'confessions'
        },
        (payload) => {
          // Remove deleted confession
          setConfessions((current) =>
            current.filter((conf) => conf.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // Only set up once

  return {
    confessions,
    isLoading,
    error,
    reload: loadConfessions,
  };
};
