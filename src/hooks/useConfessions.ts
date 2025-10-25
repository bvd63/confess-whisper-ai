import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOptimizedQuery } from "./useOptimizedQuery";
import { primeConfessionBatch } from '@/lib/confessionCache';
import { primeNicknameCache } from '@/lib/nicknameCache';

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

  const { data, isLoading, error, refetch } = useOptimizedQuery<Confession[]>({
    queryKey: ['confessions', sortBy, categoryFilter, limit],
    queryFn: async () => {
      // Fetch confessions without join (faster)
      let query = supabase
        .from('confessions')
        .select('*')
        .limit(limit);

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      if (sortBy === 'recent') {
        query = query.order('created_at', { ascending: false });
      } else {
        query = query.order('likes_count', { ascending: false });
      }

      const { data, error: queryError } = await query;
      if (queryError) throw queryError;

      // Prime caches for better performance
      if (data) {
        primeConfessionBatch(data);
        
        // Batch fetch ALL nicknames in a single query (MUCH faster)
        const uniqueUserIds = [...new Set(data.map(c => c.user_id).filter(Boolean))] as string[];
        if (uniqueUserIds.length > 0) {
          try {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('user_id, nickname')
              .in('user_id', uniqueUserIds);
            
            // Prime nickname cache with all results at once
            profiles?.forEach(profile => {
              if (profile.nickname) {
                primeNicknameCache(profile.user_id, profile.nickname);
              }
            });
          } catch (e) {
            // Silent fail for nickname batch fetch
          }
        }
      }

      return data || [];
    },
    cacheTTL: 2 * 60 * 1000, // 2 minutes
  });

  useEffect(() => {
    if (data) {
      setConfessions(data);
    }
  }, [data]);

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
    reload: refetch,
  };
};
