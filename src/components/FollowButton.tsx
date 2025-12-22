import { useState, useEffect, memo } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { logError } from "@/lib/logger";

interface FollowButtonProps {
  targetUserId: string;
  currentUserId: string | null;
}

const FollowButton = ({ targetUserId, currentUserId }: FollowButtonProps) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    checkFollowStatus();
  }, [targetUserId, currentUserId]);

  const checkFollowStatus = async () => {
    if (!currentUserId) return;

    const { data } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', currentUserId)
      .eq('following_id', targetUserId)
      .maybeSingle();

    setIsFollowing(!!data);
  };

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

    setLoading(true);
    
    const wasFollowing = isFollowing;

    try {
      if (isFollowing) {
        // Optimistic update
        setIsFollowing(false);
        
        // Trigger optimistic list update
        window.dispatchEvent(new CustomEvent('optimistic-unfollow', {
          detail: { followerId: currentUserId, followingId: targetUserId }
        }));
        
        // Unfollow
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', targetUserId);

        if (error) throw error;

        toast({
          title: t.follow_unfollowed_title,
          description: t.follow_unfollowed_desc,
        });
      } else {
        // Optimistic update
        setIsFollowing(true);
        
        // Trigger optimistic list update
        window.dispatchEvent(new CustomEvent('optimistic-follow', {
          detail: { followerId: currentUserId, followingId: targetUserId }
        }));
        
        // Follow
        const { error } = await supabase
          .from('user_follows')
          .insert({
            follower_id: currentUserId,
            following_id: targetUserId,
          });

        if (error) throw error;

        toast({
          title: t.follow_now_following,
          description: t.follow_now_following_desc,
        });
      }
    } catch (error) {
      // Rollback on error
      setIsFollowing(wasFollowing);
      
      // Trigger rollback for list
      if (wasFollowing) {
        window.dispatchEvent(new CustomEvent('optimistic-follow', {
          detail: { followerId: currentUserId, followingId: targetUserId }
        }));
      } else {
        window.dispatchEvent(new CustomEvent('optimistic-unfollow', {
          detail: { followerId: currentUserId, followingId: targetUserId }
        }));
      }
      
      logError('Error toggling follow', error instanceof Error ? error : undefined);
      toast({
        title: t.follow_error,
        description: t.follow_error_desc,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!currentUserId || currentUserId === targetUserId) return null;

  return (
    <Button
      variant={isFollowing ? "outline" : "default"}
      size="sm"
      onClick={toggleFollow}
      disabled={loading}
      className={cn(
        "gap-1 h-9 sm:h-8 min-w-[44px] px-2 sm:px-3 text-xs sm:text-sm touch-manipulation",
        isFollowing && "border-primary/30"
      )}
    >
      {isFollowing ? (
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