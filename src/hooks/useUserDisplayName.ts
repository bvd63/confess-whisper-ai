import { useState, useEffect } from 'react';
import { fetchUserDisplayInfo, getDisplayName, UserDisplayInfo } from '@/lib/displayName';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrentUser } from './useCurrentUser';

/**
 * Hook to get and format user display name with proper fallbacks
 * Handles nickname visibility, localization, and real-time updates
 * 
 * @param userId - User ID to get display name for
 * @returns Display name string (e.g., "@nickname" or "Anonymous")
 */
export function useUserDisplayName(userId: string | null | undefined) {
  const [userInfo, setUserInfo] = useState<UserDisplayInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const { user: currentUser } = useCurrentUser();

  useEffect(() => {
    if (!userId) {
      setUserInfo(null);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadUserInfo = async () => {
      setLoading(true);
      const info = await fetchUserDisplayInfo(userId);
      if (isMounted) {
        setUserInfo(info);
        setLoading(false);
      }
    };

    loadUserInfo();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const displayName = getDisplayName(
    userInfo,
    t.common_anonymous,
    currentUser?.id
  );

  return {
    displayName,
    loading,
    userInfo,
  };
}
