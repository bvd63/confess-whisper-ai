import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabaseClient";
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

export const useConfessions = (communityId: number) => {
  const [confessions, setConfessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const fetchConfessions = async () => {
      if (!communityId) return;
      const supabase = getSupabase();
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('confessions')
          .select('*')
          .eq('community_id', communityId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setConfessions(data || []);
        primeConfessionBatch(data);

        const uniqueUserIds = [...new Set(data?.map(c => c.user_id).filter(Boolean))] as string[];
        if (uniqueUserIds.length > 0) {
          try {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('user_id, nickname')
              .in('user_id', uniqueUserIds);

            profiles?.forEach(profile => {
              if (profile.nickname) {
                primeNicknameCache(profile.user_id, profile.nickname);
              }
            });
          } catch (e) {
            // Silent fail for nickname batch fetch
          }
        }
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfessions();
  }, [communityId]);

  const addConfession = (confession: any) => {
    setConfessions(prev => [confession, ...prev]);
  };

  return { confessions, loading, error, addConfession };
};
