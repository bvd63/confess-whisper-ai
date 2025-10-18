import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOptimizedQuery } from "./useOptimizedQuery";

interface UseFollowingOptions {
  userId: string | null;
}

export const useFollowing = ({ userId }: UseFollowingOptions) => {
  const { data: followingData, isLoading: followingLoading, refetch: refetchFollowing } = useOptimizedQuery<string[]>({
    queryKey: ['following', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', userId);
      if (error) throw error;
      return data?.map(f => f.following_id) || [];
    },
    enabled: !!userId,
    cacheTTL: 3 * 60 * 1000, // 3 minutes
  });

  const { data: followersData, isLoading: followersLoading, refetch: refetchFollowers } = useOptimizedQuery<string[]>({
    queryKey: ['followers', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_follows')
        .select('follower_id')
        .eq('following_id', userId);
      if (error) throw error;
      return data?.map(f => f.follower_id) || [];
    },
    enabled: !!userId,
    cacheTTL: 3 * 60 * 1000, // 3 minutes
  });

  const following = followingData || [];
  const followers = followersData || [];

  const isFollowing = useMemo(() => {
    return (targetUserId: string) => following.includes(targetUserId);
  }, [following]);

  return {
    following,
    followers,
    isFollowing,
    followingCount: following.length,
    followersCount: followers.length,
    loading: followingLoading || followersLoading,
    reload: () => {
      refetchFollowing();
      refetchFollowers();
    },
  };
};