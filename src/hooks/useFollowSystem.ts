import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getFollowStatsCached, invalidateFollowCache } from '@/lib/followCache';
import { logError } from '@/lib/logger';

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
  const [stats, setStats] = useState<FollowStats>({
    followers: 0,
    following: 0,
    isFollowing: false,
    isFollowedBy: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadStats = useCallback(async () => {
    if (!targetUserId) return;

    try {
      // Use cached follow stats (much faster)
      const profileStats = await getFollowStatsCached(targetUserId);

      let isFollowing = false;
      let isFollowedBy = false;

      if (userId && userId !== targetUserId) {
        // Batch both follow checks in parallel
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
            .maybeSingle()
        ]);

        isFollowing = !!followCheck.data;
        isFollowedBy = !!followBackCheck.data;
      }

      setStats({
        followers: profileStats?.followers_count || 0,
        following: profileStats?.following_count || 0,
        isFollowing,
        isFollowedBy,
      });
    } catch (error) {
      logError('Error loading follow stats', error as Error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, targetUserId]);

  const follow = useCallback(async () => {
    if (!userId || !targetUserId || userId === targetUserId) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('user_follows')
        .insert({
          follower_id: userId,
          following_id: targetUserId,
        });

      if (error) throw error;

      // Optimistic update: current user is now following someone
      setStats(prev => ({
        ...prev,
        isFollowing: true,
      }));
      
      // Invalidate cache to force fresh data next time
      invalidateFollowCache(targetUserId);
    } catch (error) {
      logError('Error following user', error as Error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [userId, targetUserId]);

  const unfollow = useCallback(async () => {
    if (!userId || !targetUserId) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', userId)
        .eq('following_id', targetUserId);

      if (error) throw error;

      // Optimistic update: current user is no longer following someone
      setStats(prev => ({
        ...prev,
        isFollowing: false,
      }));
      
      // Invalidate cache to force fresh data next time
      invalidateFollowCache(targetUserId);
    } catch (error) {
      logError('Error unfollowing user', error as Error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [userId, targetUserId]);

  const toggleFollow = useCallback(async () => {
    if (stats.isFollowing) {
      await unfollow();
    } else {
      await follow();
    }
  }, [stats.isFollowing, follow, unfollow]);

  useEffect(() => {
    loadStats();

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
          console.log('[REALTIME] FOLLOW INSERT received:', payload);
          const newRecord = payload.new as { follower_id: string; following_id: string };
          
          // If someone followed this profile → increment Followers
          if (newRecord.following_id === targetUserId) {
            console.log('[REALTIME] → Incrementing Followers');
            setStats(prev => ({
              ...prev,
              followers: prev.followers + 1
            }));
          }
          
          // If this profile followed someone → increment Following
          if (newRecord.follower_id === targetUserId) {
            console.log('[REALTIME] → Incrementing Following');
            setStats(prev => ({
              ...prev,
              following: prev.following + 1
            }));
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
          console.log('[REALTIME] FOLLOW DELETE received:', payload);
          const oldRecord = payload.old as { follower_id: string; following_id: string };
          
          // If someone unfollowed this profile → decrement Followers
          if (oldRecord.following_id === targetUserId) {
            console.log('[REALTIME] → Decrementing Followers');
            setStats(prev => ({
              ...prev,
              followers: Math.max(0, prev.followers - 1)
            }));
          }
          
          // If this profile unfollowed someone → decrement Following
          if (oldRecord.follower_id === targetUserId) {
            console.log('[REALTIME] → Decrementing Following');
            setStats(prev => ({
              ...prev,
              following: Math.max(0, prev.following - 1)
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadStats, targetUserId]);

  return {
    stats,
    isLoading,
    isProcessing,
    follow,
    unfollow,
    toggleFollow,
    reload: loadStats,
  };
};
