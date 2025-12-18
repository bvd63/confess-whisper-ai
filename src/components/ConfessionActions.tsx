import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart, Share2, Bookmark, Trash2, MessageCircle, Rocket, Clock3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useHaptic } from "@/hooks/useHaptic";
import { logError } from "@/lib/logger";
import { getBoostStatus } from "@/lib/boosts";

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
  commentsCount?: number;
  boostExpiresAt?: string | null;
  onBoostSuccess?: (endsAt: string) => void;
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
  onReport: _onReport,
  onDelete,
  commentsCount,
  boostExpiresAt,
  onBoostSuccess,
}: ConfessionActionsProps) => {
  const [localLikesCount, setLocalLikesCount] = useState(likesCount);
  const [localIsLiked, setLocalIsLiked] = useState(isLiked);
  const [localIsBookmarked, setLocalIsBookmarked] = useState(isBookmarked);
  const [isLiking, setIsLiking] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [isBoosting, setIsBoosting] = useState(false);
  const [localBoostExpiry, setLocalBoostExpiry] = useState<string | null>(boostExpiresAt || null);
  const { toast } = useToast();
  const { t } = useLanguage();
  const { vibrate } = useHaptic();
  const BOOST_COST = 25;

  useEffect(() => {
    setLocalLikesCount(likesCount);
  }, [likesCount]);

  useEffect(() => {
    setLocalIsLiked(isLiked);
  }, [isLiked]);

  useEffect(() => {
    setLocalIsBookmarked(isBookmarked);
  }, [isBookmarked]);

  useEffect(() => {
    setLocalBoostExpiry(boostExpiresAt || null);
  }, [boostExpiresAt]);

  const boostStatus = useMemo(() => getBoostStatus(localBoostExpiry || null), [localBoostExpiry]);

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

  const handleBoost = async () => {
    if (!currentUserId) {
      toast({
        title: t.error_auth,
        description: t.error_auth,
        variant: "destructive",
      });
      return;
    }

    if (!isOwner) {
      toast({
        title: t.boost_error,
        description: t.boost_error_active,
        variant: "destructive",
      });
      return;
    }

    if (isBoosting) return;
    setIsBoosting(true);
    vibrate('medium');

    try {
      const { data, error } = await supabase.functions.invoke('boost-confession', {
        body: { confessionId },
      });

      if (error) {
        const message = error.message || '';
        toast({
          title: t.boost_error,
          description: message.toLowerCase().includes('insufficient') ? t.boost_not_enough : t.error_generic,
          variant: "destructive",
        });
        return;
      }

      if (data?.error === 'BOOST_ALREADY_ACTIVE') {
        if (data?.endsAt) {
          setLocalBoostExpiry(data.endsAt);
          onBoostSuccess?.(data.endsAt);
        }
        toast({
          title: t.boost_active,
          description: t.boost_confirm,
        });
        return;
      }

      const endsAt = data?.boost?.endsAt || data?.boost?.ends_at;
      if (endsAt) {
        setLocalBoostExpiry(endsAt);
        onBoostSuccess?.(endsAt);
        toast({
          title: t.boost_success_title,
          description: t.boost_success_description,
        });
        return;
      }

      toast({
        title: t.boost_error,
        description: t.error_generic,
        variant: "destructive",
      });
    } catch (error) {
      logError('Error boosting confession', error instanceof Error ? error : undefined);
      toast({
        title: t.boost_error,
        description: t.error_generic,
        variant: "destructive",
      });
    } finally {
      setIsBoosting(false);
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
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap min-w-0">
        <Button
          variant={localIsLiked ? "default" : "ghost"}
          size="sm"
          onClick={handleLike}
          disabled={isLiking}
          className="h-10 px-3 rounded-full bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 flex-shrink-0"
        >
          <Heart className={`w-4 h-4 ${localIsLiked ? 'fill-white text-white' : ''}`} />
          <span className="ml-2 text-sm font-semibold">{localLikesCount}</span>
        </Button>

        <div className="flex items-center gap-1 px-3 h-10 rounded-full bg-white/5 border border-white/10 text-white/80 text-sm flex-shrink-0">
          <MessageCircle className="w-4 h-4" />
          <span className="font-semibold">{commentsCount ?? 0}</span>
        </div>

        <Button
          variant={localIsBookmarked ? "secondary" : "ghost"}
          size="sm"
          onClick={handleBookmark}
          disabled={isBookmarking}
          className="h-10 px-3 rounded-full bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 flex-shrink-0"
        >
          <Bookmark className={`w-4 h-4 ${localIsBookmarked ? 'fill-white text-white' : ''}`} />
          <span className="ml-2 text-sm hidden sm:inline">{localIsBookmarked ? t.bookmarks_saved : t.bookmarks_add}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleShare}
          className="h-10 px-3 rounded-full bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 flex-shrink-0"
        >
          <Share2 className="w-4 h-4" />
          <span className="ml-2 text-sm hidden sm:inline">{t.share}</span>
        </Button>

        <div className="ml-auto flex items-center gap-2 flex-wrap min-w-0">
          {isOwner && (
            <Button
              variant={boostStatus.isBoosted ? "secondary" : "default"}
              size="sm"
              onClick={handleBoost}
              disabled={isBoosting}
              className="h-10 px-3 rounded-full bg-gradient-to-r from-primary/90 via-primary to-accent text-primary-foreground shadow-[0_10px_30px_rgba(99,102,241,0.35)] hover:shadow-[0_12px_34px_rgba(99,102,241,0.45)] flex-shrink-0"
            >
              <Rocket className="w-4 h-4 mr-2" />
              <span className="text-sm font-semibold whitespace-nowrap">
                {boostStatus.isBoosted
                  ? t.boost_active
                  : t.boost_cta}
              </span>
              {!boostStatus.isBoosted && (
                <span className="ml-2 text-[12px] text-white/80 whitespace-nowrap">
                  {t.boost_price?.replace('{price}', BOOST_COST.toString())}
                </span>
              )}
              {boostStatus.isBoosted && (
                <span className="ml-2 inline-flex items-center text-[12px] text-primary-foreground/80 whitespace-nowrap">
                  <Clock3 className="w-3.5 h-3.5 mr-1" />
                  {boostStatus.lessThanHour ? '<1h' : `${boostStatus.hoursLeft}h`}
                </span>
              )}
            </Button>
          )}

          {isOwner && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-10 sm:h-9 min-w-[44px] px-3 rounded-full text-muted-foreground hover:text-destructive hover:bg-muted/50 transition-all touch-manipulation"
            >
              <Trash2 className="w-4 h-4 flex-shrink-0" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfessionActions;
