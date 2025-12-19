import { useOptimizedQuery } from './useOptimizedQuery';
import { supabase } from '@/integrations/supabase/client';

export const useShadowBan = (userId: string | null) => {
  const { data: isShadowBanned, isLoading } = useOptimizedQuery({
    queryKey: ['shadow-ban-status', userId],
    queryFn: async () => {
      if (!userId) return false;

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser || authUser.id !== userId) return false;

      const { data, error } = await supabase
        .from('profiles')
        .select('is_shadow_banned')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data?.is_shadow_banned || false;
    },
    cacheKey: `shadowban-${userId}`,
    cacheTTL: 300000, // 5 minutes
    useCircuitBreaker: true,
    useRetry: true,
    useDedupe: true,
    enabled: !!userId,
  });

  return {
    isShadowBanned: isShadowBanned || false,
    isLoading,
  };
};