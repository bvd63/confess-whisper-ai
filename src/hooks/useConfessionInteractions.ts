import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseConfessionInteractionsProps {
  userId: string | null;
}

export const useConfessionInteractions = ({ userId }: UseConfessionInteractionsProps) => {
  const [likedConfessions, setLikedConfessions] = useState<Set<string>>(new Set());
  const [bookmarkedConfessions, setBookmarkedConfessions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      loadInteractions();
    } else {
      setLikedConfessions(new Set());
      setBookmarkedConfessions(new Set());
    }
  }, [userId]);

  const loadInteractions = async () => {
    if (!userId) return;
    
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
      console.error('Error loading user interactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    likedConfessions,
    bookmarkedConfessions,
    isLoading,
    reloadLikes: loadInteractions,
    reloadBookmarks: loadInteractions,
  };
};
