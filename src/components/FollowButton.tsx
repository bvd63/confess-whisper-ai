import { memo } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { logError } from "@/lib/logger";
import { useFollowSystem } from "@/hooks/useFollowSystem";

// React Query keys touched by follow/unfollow optimistic updates:
// - ["follow-counts", profileUserId]
// - ["followers-list", profileUserId]
// - ["following-list", profileUserId]
// - ["follow-rel", currentUserId, profileUserId]

interface FollowButtonProps {
  targetUserId: string;
  currentUserId: string | null;
}

const FollowButton = ({ targetUserId, currentUserId }: FollowButtonProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();

  const { stats, isProcessing, toggleFollow: toggleFollowInternal } = useFollowSystem(
    currentUserId,
    targetUserId
  );

  const toggleFollow = async () => {
    if (!currentUserId) {
      toast({
        title: t.auth_error,
        description: t.auth_error_generic,
        variant: "destructive",
      });
      return;
    }

    if (currentUserId === targetUserId) {
      toast({
        title: t.common_error,
        description: t.follow_cannot_self_desc,
        variant: "destructive",
      });
      return;
    }

    try {
      const wasFollowing = stats.isFollowing;
      await toggleFollowInternal();

      toast({
        title: wasFollowing ? t.follow_unfollowed_title : t.follow_now_following,
        description: wasFollowing ? t.follow_unfollowed_desc : t.follow_now_following_desc,
      });
    } catch (error) {
      logError('Error toggling follow', error instanceof Error ? error : undefined);
      toast({
        title: t.follow_error,
        description: t.follow_error_desc,
        variant: "destructive",
      });
    }
  };

  if (!currentUserId || currentUserId === targetUserId) return null;

  return (
    <Button
      variant={stats.isFollowing ? "outline" : "default"}
      size="sm"
      onClick={toggleFollow}
      disabled={isProcessing}
      className={cn(
        "gap-1 h-9 sm:h-8 min-w-[44px] px-2 sm:px-3 text-xs sm:text-sm touch-manipulation",
        stats.isFollowing && "border-primary/30"
      )}
    >
      {stats.isFollowing ? (
        <>
          <UserMinus className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
          <span className="hidden xs:inline">Following</span>
        </>
      ) : (
        <>
          <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
          <span className="hidden xs:inline">Follow</span>
        </>
      )}
    </Button>
  );
};

export default memo(FollowButton);