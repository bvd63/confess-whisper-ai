import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart, Share2, Bookmark, Trash2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useHaptic } from "@/hooks/useHaptic";

interface ConfessionActionsProps {
  confessionId: string;
  confessionUserId?: string | null;
  currentUserId: string | null;
  likesCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  onLikeChange: () => void;
  onBookmarkChange: () => void;
  onShare: () => void;
  onReport?: () => void;
  onDelete?: () => void;
}

const ConfessionActions = ({
  confessionId,
  confessionUserId,
  currentUserId,
  likesCount,
  isLiked,
  isBookmarked,
  onLikeChange,
  onBookmarkChange,
  onShare,
  onReport,
  onDelete,
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
      console.error('Error updating like:', error);
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
      console.error('Error updating bookmark:', error);
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
      console.error('Error tracking share:', error);
    }
    onShare();
  };

  const isOwner = currentUserId === confessionUserId;

  return (
    <div className="flex items-center gap-2 sm:gap-2 flex-wrap">
      {/* Bookmark Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBookmark}
        disabled={isBookmarking}
        className={`h-12 sm:h-10 min-w-[48px] px-3 sm:px-3 ${localIsBookmarked ? 'text-primary' : 'text-muted-foreground'} hover:text-primary transition-colors touch-manipulation ${isBookmarking ? 'opacity-50' : ''}`}
      >
        <Bookmark className={`w-4 h-4 flex-shrink-0 ${localIsBookmarked ? 'fill-current' : ''} ${isBookmarking ? 'animate-pulse' : ''}`} />
      </Button>

      {/* Owner Actions */}
      <div className="ml-auto flex items-center gap-2 sm:gap-2">
        {isOwner && onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-12 sm:h-10 min-w-[48px] px-3 text-muted-foreground hover:text-destructive transition-colors touch-manipulation"
          >
            <Trash2 className="w-4 h-4 flex-shrink-0" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default ConfessionActions;
