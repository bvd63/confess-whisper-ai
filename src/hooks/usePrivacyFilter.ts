import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePrivacyFilter = (targetUserId: string | null, currentUserId: string | null) => {
  const { data: privacySettings, isLoading } = useQuery({
    queryKey: ['privacy-settings', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('privacy_mode, is_shadow_banned')
        .eq('user_id', targetUserId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!targetUserId,
  });

  const { data: isFollowing } = useQuery({
    queryKey: ['is-following', currentUserId, targetUserId],
    queryFn: async () => {
      if (!currentUserId || !targetUserId) return false;

      const { data, error } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('following_id', targetUserId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!currentUserId && !!targetUserId,
  });

  const canViewProfile = () => {
    if (!privacySettings) return true;
    if (targetUserId === currentUserId) return true; // Own profile
    if (privacySettings.is_shadow_banned && targetUserId !== currentUserId) return false;

    switch (privacySettings.privacy_mode) {
      case 'public':
        return true;
      case 'limited':
        return isFollowing || false;
      case 'private':
        return false;
      default:
        return true;
    }
  };

  return {
    canViewProfile: canViewProfile(),
    privacyMode: privacySettings?.privacy_mode || 'public',
    isShadowBanned: privacySettings?.is_shadow_banned || false,
    isLoading,
  };
};