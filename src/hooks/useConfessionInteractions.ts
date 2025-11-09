import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";

interface UseConfessionInteractionsProps {
  userId: string | null;
}

export const useConfessionInteractions = ({ userId }: UseConfessionInteractionsProps) => {
  const [likedConfessions, setLikedConfessions] = useState<Set<string>>(new Set());
  const [bookmarkedConfessions, setBookmarkedConfessions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const loadInteractions = useCallback(async () => {
    if (!userId) {
      setLikedConfessions(new Set());
      setBookmarkedConfessions(new Set());
      return;
    }
    
    setIsLoading(true);
    try {
      const [likesResult, bookmarksResult] = await Promise.all([
        supabase.from('user_likes').select('confession_id').eq('user_id', userId),
        supabase.from('bookmarks').select('confession_id').eq('user_id', userId),
      ]);

      if (likesResult.data) {
        setLikedConfessions(new Set(likesResult.data.map(like => like.confession_id)));
      }
      
      if (bookmarksResult.data) {
        setBookmarkedConfessions(new Set(bookmarksResult.data.map(bookmark => bookmark.confession_id)));
      }
    } catch (error) {
      logError('Error loading user interactions', error as Error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadInteractions();
  }, [loadInteractions]);

  return {
    likedConfessions,
    bookmarkedConfessions,
    isLoading,
    reloadLikes: loadInteractions,
    reloadBookmarks: loadInteractions,
  };
};
