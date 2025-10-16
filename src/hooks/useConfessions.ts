import { useState, useEffect, useCallback } from "react";
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

  const loadConfessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
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
    } catch (err) {
      console.error('Error loading confessions:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [sortBy, categoryFilter, limit]);

  useEffect(() => {
    loadConfessions();
  }, [loadConfessions]);

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('confessions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'confessions'
        },
        () => {
          loadConfessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadConfessions]);

  return {
    confessions,
    isLoading,
    error,
    reload: loadConfessions,
  };
};
