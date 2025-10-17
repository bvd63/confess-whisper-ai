import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useShadowBan = (userId: string | null) => {
  const { data: isShadowBanned, isLoading } = useQuery({
    queryKey: ['shadow-ban-status', userId],
    queryFn: async () => {
      if (!userId) return false;

      const { data, error } = await supabase
        .from('profiles')
        .select('is_shadow_banned')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data?.is_shadow_banned || false;
    },
    enabled: !!userId,
  });

  return {
    isShadowBanned: isShadowBanned || false,
    isLoading,
  };
};