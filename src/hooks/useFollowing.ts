import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseFollowingOptions {
  userId: string | null;
}

export const useFollowing = ({ userId }: UseFollowingOptions) => {
  const [following, setFollowing] = useState<string[]>([]);
  const [followers, setFollowers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadFollowing();
      loadFollowers();
    }
  }, [userId]);

  const loadFollowing = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', userId);

    if (!error && data) {
      setFollowing(data.map(f => f.following_id));
    }
  };

  const loadFollowers = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('user_follows')
      .select('follower_id')
      .eq('following_id', userId);

    if (!error && data) {
      setFollowers(data.map(f => f.follower_id));
    }
    
    setLoading(false);
  };

  const isFollowing = (targetUserId: string) => {
    return following.includes(targetUserId);
  };

  return {
    following,
    followers,
    isFollowing,
    followingCount: following.length,
    followersCount: followers.length,
    loading,
    reload: () => {
      loadFollowing();
      loadFollowers();
    },
  };
};