import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart, Share2, Bookmark, Trash2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleLike = async () => {
    if (!currentUserId) {
      toast({
        title: t.error_auth,
        description: t.error_auth,
        variant: "destructive",
      });
      return;
    }

    const newLiked = !localIsLiked;
    const optimisticCount = newLiked ? localLikesCount + 1 : Math.max(0, localLikesCount - 1);
    
    // Optimistic update
    setLocalIsLiked(newLiked);
    setLocalLikesCount(optimisticCount);

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

    const newBookmarked = !localIsBookmarked;
    
    // Optimistic update
    setLocalIsBookmarked(newBookmarked);

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
    }
  };

  const handleShare = async () => {
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
    <div className="flex items-center gap-3">
      {/* Like Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLike}
        className={`h-8 px-3 gap-2 ${localIsLiked ? 'text-primary' : 'text-muted-foreground'} hover:text-primary transition-colors`}
      >
        <Heart className={`w-4 h-4 ${localIsLiked ? 'fill-current' : ''}`} />
        <span className="text-sm">{localLikesCount}</span>
      </Button>

      {/* Share Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleShare}
        className="h-8 px-3 gap-2 text-muted-foreground hover:text-primary transition-colors"
      >
        <Share2 className="w-4 h-4" />
        <span className="text-sm">{t.share}</span>
      </Button>

      {/* Bookmark Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBookmark}
        className={`h-8 px-3 gap-2 ${localIsBookmarked ? 'text-primary' : 'text-muted-foreground'} hover:text-primary transition-colors`}
      >
        <Bookmark className={`w-4 h-4 ${localIsBookmarked ? 'fill-current' : ''}`} />
      </Button>

      {/* Owner Actions */}
      <div className="ml-auto flex items-center gap-2">
        {isOwner && onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-8 px-2 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
        {onReport && !isOwner && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReport}
            className="h-8 px-2 text-muted-foreground hover:text-destructive transition-colors"
          >
            <AlertCircle className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default ConfessionActions;
