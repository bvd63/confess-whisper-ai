import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart, Share2, Bookmark, Trash2, AlertCircle, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useHaptic } from "@/hooks/useHaptic";
import { logError } from "@/lib/logger";

interface ConfessionActionsProps {
  confessionId: string;
  confessionUserId?: string | null;
  currentUserId: string | null;
  likesCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  commentsCount?: number;
  onLikeChange: () => void;
  onBookmarkChange: () => void;
  onShare: () => void;
  onReport?: () => void;
  onDelete?: () => void;
  onCommentsClick?: () => void;
}

const ConfessionActions = ({
  confessionId,
  confessionUserId,
  currentUserId,
  likesCount,
  isLiked,
  isBookmarked,
  commentsCount = 0,
  onLikeChange,
  onBookmarkChange,
  onShare,
  onReport,
  onDelete,
  onCommentsClick,
}: ConfessionActionsProps) => {
  const [localLikesCount, setLocalLikesCount] = useState(likesCount);
  const [localIsLiked, setLocalIsLiked] = useState(isLiked);
  const [localIsBookmarked, setLocalIsBookmarked] = useState(isBookmarked);
  const [isLiking, setIsLiking] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  const { vibrate } = useHaptic();

  const handleLike = async () => {
    if (!currentUserId) {
      toast({
        title: t.error_auth,
        description: t.error_auth,
        variant: "destructive",
      });
      return;
    }

    if (isLiking) return;

    const newLiked = !localIsLiked;
    const optimisticCount = newLiked ? localLikesCount + 1 : Math.max(0, localLikesCount - 1);
    
    // Optimistic update
    setLocalIsLiked(newLiked);
    setLocalLikesCount(optimisticCount);
    setIsLiking(true);
    vibrate('light');

    try {
      if (newLiked) {
        const { error } = await supabase
          .from('user_likes')
          .insert({
            user_id: currentUserId,
            confession_id: confessionId,
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_likes')
          .delete()
          .eq('user_id', currentUserId)
          .eq('confession_id', confessionId);
        if (error) throw error;
      }
      
      onLikeChange();
    } catch (error) {
      // Revert on error
      setLocalIsLiked(!newLiked);
      setLocalLikesCount(likesCount);
      logError('Error updating like', error instanceof Error ? error : undefined);
      toast({
        title: t.error_generic,
        description: t.error_generic,
        variant: "destructive",
      });
    } finally {
      setIsLiking(false);
    }
  };

  const handleBookmark = async () => {
    if (!currentUserId) {
      toast({
        title: t.error_auth,
        description: t.error_auth,
        variant: "destructive",
      });
      return;
    }

    if (isBookmarking) return;

    const newBookmarked = !localIsBookmarked;
    
    // Optimistic update
    setLocalIsBookmarked(newBookmarked);
    setIsBookmarking(true);
    vibrate('light');

    try {
      if (newBookmarked) {
        const { error } = await supabase
          .from('bookmarks')
          .insert({
            user_id: currentUserId,
            confession_id: confessionId,
          });
        if (error) throw error;
        toast({
          title: t.bookmarks_saved,
          description: t.bookmarks_add,
        });
      } else {
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', currentUserId)
          .eq('confession_id', confessionId);
        if (error) throw error;
        toast({
          title: t.success_deleted,
          description: t.bookmarks_remove,
        });
      }
      
      onBookmarkChange();
    } catch (error) {
      // Revert on error
      setLocalIsBookmarked(!newBookmarked);
      logError('Error updating bookmark', error instanceof Error ? error : undefined);
      toast({
        title: t.error_generic,
        description: t.error_generic,
        variant: "destructive",
      });
    } finally {
      setIsBookmarking(false);
    }
  };

  const handleShare = async () => {
    vibrate('medium');
    // Increment share count
    try {
      await supabase.rpc('increment_share_count', { confession_id: confessionId });
    } catch (error) {
      logError('Error tracking share', error instanceof Error ? error : undefined);
    }
    onShare();
  };

  const isOwner = currentUserId === confessionUserId;

  return (
    <div className="flex items-center gap-2 flex-1">
      {/* Comment Action */}
      {onCommentsClick && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onCommentsClick}
          className="h-10 px-3 rounded-full hover:bg-muted/60 transition-colors touch-manipulation gap-1.5"
          aria-label={`${commentsCount} comments`}
        >
          <MessageCircle className="w-5 h-5 text-muted-foreground" />
          {commentsCount > 0 && (
            <span className="text-xs font-medium text-muted-foreground">{commentsCount}</span>
          )}
        </Button>
      )}

      {/* Share Action */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleShare}
        className="h-10 w-10 p-0 rounded-full hover:bg-muted/60 transition-colors touch-manipulation"
        aria-label={t.share}
      >
        <Share2 className="w-5 h-5 text-muted-foreground" />
      </Button>

      {/* Owner Actions */}
      <div className="ml-auto flex items-center gap-2">
        {isOwner && onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-10 w-10 p-0 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors touch-manipulation"
            aria-label={t.delete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default ConfessionActions;
