import { useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getFollowStatsCached, invalidateFollowCache } from '@/lib/followCache';
import { logError } from '@/lib/logger';
import {
  applyOptimisticFollow,
  applyOptimisticUnfollow,
  type FollowCounts,
  followCountsKey,
  followRelationshipKey,
  rollbackOptimisticFollow,
} from '@/lib/followQuery';

interface FollowStats {
  followers: number;
  following: number;
  isFollowing: boolean;
  isFollowedBy: boolean;
}

/**
 * Instagram-style follow system hook
 */
export const useFollowSystem = (userId: string | null, targetUserId: string | null) => {
  const queryClient = useQueryClient();

  const countsQuery = useQuery({
    queryKey: targetUserId ? followCountsKey(targetUserId) : ['follow-counts', 'disabled'],
    queryFn: async () => {
      if (!targetUserId) return { followersCount: 0, followingCount: 0 };
      const profileStats = await getFollowStatsCached(targetUserId);
      return {
        followersCount: profileStats?.followers_count || 0,
        followingCount: profileStats?.following_count || 0,
      };
    },
    enabled: !!targetUserId,
  });

  const relationshipQuery = useQuery({
    queryKey:
      userId && targetUserId ? followRelationshipKey(userId, targetUserId) : ['follow-rel', 'disabled'],
    queryFn: async () => {
      if (!userId || !targetUserId || userId === targetUserId) {
        return { isFollowing: false, isFollowedBy: false };
      }

      const [followCheck, followBackCheck] = await Promise.all([
        supabase
          .from('user_follows')
          .select('id')
          .eq('follower_id', userId)
          .eq('following_id', targetUserId)
          .maybeSingle(),
        supabase
          .from('user_follows')
          .select('id')
          .eq('follower_id', targetUserId)
          .eq('following_id', userId)
          .maybeSingle(),
      ]);

      return {
        isFollowing: !!followCheck.data,
        isFollowedBy: !!followBackCheck.data,
      };
    },
    enabled: !!userId && !!targetUserId,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !targetUserId || userId === targetUserId) return;
      const { error } = await supabase
        .from('user_follows')
        .insert({ follower_id: userId, following_id: targetUserId });
      if (error) throw error;
    },
    onMutate: async () => {
      if (!userId || !targetUserId || userId === targetUserId) return;

      // Cancel queries that will be optimistically updated
      await Promise.all([
        queryClient.cancelQueries({ queryKey: followCountsKey(targetUserId) }),
        queryClient.cancelQueries({ queryKey: followCountsKey(userId) }),
        queryClient.cancelQueries({ queryKey: followRelationshipKey(userId, targetUserId) }),
      ]);

      return applyOptimisticFollow(queryClient, { currentUserId: userId, targetUserId });
    },
    onError: (error, _vars, ctx) => {
      if (!userId || !targetUserId) return;
      rollbackOptimisticFollow(queryClient, { currentUserId: userId, targetUserId }, ctx);
      logError('Error following user', error as Error);
    },
    onSettled: async () => {
      if (!userId || !targetUserId) return;
      invalidateFollowCache(targetUserId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: followCountsKey(targetUserId) }),
        queryClient.invalidateQueries({ queryKey: followCountsKey(userId) }),
        queryClient.invalidateQueries({ queryKey: followRelationshipKey(userId, targetUserId) }),
      ]);
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !targetUserId || userId === targetUserId) return;
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', userId)
        .eq('following_id', targetUserId);
      if (error) throw error;
    },
    onMutate: async () => {
      if (!userId || !targetUserId || userId === targetUserId) return;

      await Promise.all([
        queryClient.cancelQueries({ queryKey: followCountsKey(targetUserId) }),
        queryClient.cancelQueries({ queryKey: followCountsKey(userId) }),
        queryClient.cancelQueries({ queryKey: followRelationshipKey(userId, targetUserId) }),
      ]);

      return applyOptimisticUnfollow(queryClient, { currentUserId: userId, targetUserId });
    },
    onError: (error, _vars, ctx) => {
      if (!userId || !targetUserId) return;
      rollbackOptimisticFollow(queryClient, { currentUserId: userId, targetUserId }, ctx);
      logError('Error unfollowing user', error as Error);
    },
    onSettled: async () => {
      if (!userId || !targetUserId) return;
      invalidateFollowCache(targetUserId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: followCountsKey(targetUserId) }),
        queryClient.invalidateQueries({ queryKey: followCountsKey(userId) }),
        queryClient.invalidateQueries({ queryKey: followRelationshipKey(userId, targetUserId) }),
      ]);
    },
  });

  const follow = async () => {
    await followMutation.mutateAsync();
  };

  const unfollow = async () => {
    await unfollowMutation.mutateAsync();
  };

  const toggleFollow = async () => {
    if (relationshipQuery.data?.isFollowing) {
      await unfollow();
    } else {
      await follow();
    }
  };

  useEffect(() => {
    if (!targetUserId) return;

    // Subscribe to realtime updates on user_follows table
    // Listen for both INSERT and DELETE events to update counters instantly
    const channel = supabase
      .channel(`follow-stats-${targetUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_follows',
        },
        (payload) => {
          const newRecord = payload.new as { follower_id: string; following_id: string };

          // If someone followed this profile → increment Followers
          if (newRecord.following_id === targetUserId) {
            queryClient.setQueryData<FollowCounts>(followCountsKey(targetUserId), (prev) => {
              if (!prev) return prev;
              return { ...prev, followersCount: prev.followersCount + 1 };
            });
          }

          // If this profile followed someone → increment Following
          if (newRecord.follower_id === targetUserId) {
            queryClient.setQueryData<FollowCounts>(followCountsKey(targetUserId), (prev) => {
              if (!prev) return prev;
              return { ...prev, followingCount: prev.followingCount + 1 };
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'user_follows',
        },
        (payload) => {
          const oldRecord = payload.old as { follower_id: string; following_id: string };

          // If someone unfollowed this profile → decrement Followers
          if (oldRecord.following_id === targetUserId) {
            queryClient.setQueryData<FollowCounts>(followCountsKey(targetUserId), (prev) => {
              if (!prev) return prev;
              return { ...prev, followersCount: Math.max(0, prev.followersCount - 1) };
            });
          }

          // If this profile unfollowed someone → decrement Following
          if (oldRecord.follower_id === targetUserId) {
            queryClient.setQueryData<FollowCounts>(followCountsKey(targetUserId), (prev) => {
              if (!prev) return prev;
              return { ...prev, followingCount: Math.max(0, prev.followingCount - 1) };
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, targetUserId]);

  const stats: FollowStats = useMemo(() => {
    const followers = countsQuery.data?.followersCount ?? 0;
    const following = countsQuery.data?.followingCount ?? 0;
    const isFollowing = relationshipQuery.data?.isFollowing ?? false;
    const isFollowedBy = relationshipQuery.data?.isFollowedBy ?? false;
    return { followers, following, isFollowing, isFollowedBy };
  }, [countsQuery.data, relationshipQuery.data]);

  return {
    stats,
    isLoading: countsQuery.isLoading || relationshipQuery.isLoading,
    isProcessing: followMutation.isPending || unfollowMutation.isPending,
    follow,
    unfollow,
    toggleFollow,
    reload: async () => {
      if (targetUserId) {
        await queryClient.invalidateQueries({ queryKey: followCountsKey(targetUserId) });
      }
      if (userId && targetUserId) {
        await queryClient.invalidateQueries({ queryKey: followRelationshipKey(userId, targetUserId) });
      }
    },
  };
};
