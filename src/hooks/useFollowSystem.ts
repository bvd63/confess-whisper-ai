import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
      // Get follower count
      const { count: followersCount } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', targetUserId);

      // Get following count
      const { count: followingCount } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', targetUserId);

      // Check if current user follows target
      let isFollowing = false;
      let isFollowedBy = false;

      if (userId && userId !== targetUserId) {
        const { data: followData } = await supabase
          .from('user_follows')
          .select('id')
          .eq('follower_id', userId)
          .eq('following_id', targetUserId)
          .single();

        isFollowing = !!followData;

        // Check if target follows current user
        const { data: followBackData } = await supabase
          .from('user_follows')
          .select('id')
          .eq('follower_id', targetUserId)
          .eq('following_id', userId)
          .single();

        isFollowedBy = !!followBackData;
      }

      setStats({
        followers: followersCount || 0,
        following: followingCount || 0,
        isFollowing,
        isFollowedBy,
      });
    } catch (error) {
      console.error('Error loading follow stats:', error);
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

      setStats(prev => ({
        ...prev,
        followers: prev.followers + 1,
        isFollowing: true,
      }));
    } catch (error) {
      console.error('Error following user:', error);
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

      setStats(prev => ({
        ...prev,
        followers: Math.max(0, prev.followers - 1),
        isFollowing: false,
      }));
    } catch (error) {
      console.error('Error unfollowing user:', error);
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

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`follow-stats-${targetUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_follows',
          filter: `following_id=eq.${targetUserId}`
        },
        () => {
          loadStats();
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
