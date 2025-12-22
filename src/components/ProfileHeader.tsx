import { EnhancedButton } from "@/components/EnhancedButton";
import { AnimatedCard } from "@/components/AnimatedCard";
import { UserDisplayName } from "@/components/UserDisplayName";
import { MessageCircle, UserPlus, UserMinus, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFollowSystem } from "@/hooks/useFollowSystem";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface ProfileHeaderProps {
  userId: string;
  currentUserId: string | null;
  nickname: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  confessionsCount: number;
  onEditProfile?: () => void;
}

/**
 * Instagram-style profile header with follow/message actions
 */
export const ProfileHeader = ({
  userId,
  currentUserId,
  nickname,
  avatarUrl,
  bio,
  confessionsCount,
  onEditProfile,
}: ProfileHeaderProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { stats } = useFollowSystem(currentUserId, userId);
  const [isProcessing, setIsProcessing] = useState(false);

  const [followersCount, setFollowersCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);
  const [isFollowing, setIsFollowing] = useState(false);

  const initializedForUserIdRef = useRef<string | null>(null);
  
  const isOwnProfile = currentUserId === userId;

  useEffect(() => {
    if (initializedForUserIdRef.current === userId) return;
    setFollowersCount(stats.followers);
    setFollowingCount(stats.following);
    setIsFollowing(stats.isFollowing);
    initializedForUserIdRef.current = userId;
  }, [userId, stats.followers, stats.following, stats.isFollowing]);

  const handleToggleFollow = async () => {
    if (!currentUserId || isOwnProfile || isProcessing) return;

    setIsProcessing(true);

    const wasFollowing = isFollowing;

    if (!wasFollowing) {
      setFollowersCount((prev) => prev + 1);
      setIsFollowing(true);
      try {
        const { error } = await supabase
          .from("user_follows")
          .insert({ follower_id: currentUserId, following_id: userId });
        if (error) throw error;
      } catch {
        setFollowersCount((prev) => Math.max(0, prev - 1));
        setIsFollowing(false);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    setFollowersCount((prev) => Math.max(0, prev - 1));
    setIsFollowing(false);
    try {
      const { error } = await supabase
        .from("user_follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", userId);
      if (error) throw error;
    } catch {
      setFollowersCount((prev) => prev + 1);
      setIsFollowing(true);
    } finally {
      setIsProcessing(false);
    }
  };

  // Tier-based visual styles - simplified since badges are now in UserDisplayName
  const tierStyles = {
    cardClass: "",
    avatarClass: "border-2 border-primary/20",
    glowClass: "",
  };

  return (
    <AnimatedCard hover="lift" className={cn("p-6 border border-border/50 rounded-2xl", tierStyles.cardClass)}>
      {/* Avatar and Stats Row */}
      <div className="flex items-center gap-4 mb-4">
          <Avatar className={cn("w-20 h-20 shadow-lg border-2 border-primary/20", tierStyles.avatarClass, tierStyles.glowClass)}>
            <AvatarImage src={avatarUrl || undefined} alt={nickname || t.confession_anonymous} />
            <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary/20 to-primary/10">
              {(nickname || t.confession_anonymous).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

        <div className="flex-1 flex justify-around">
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold">{confessionsCount}</span>
            <span className="text-xs text-muted-foreground">{t.profile_posts || "Posts"}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold">{followersCount}</span>
            <span className="text-xs text-muted-foreground">{t.profile_followers || "Followers"}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold">{followingCount}</span>
            <span className="text-xs text-muted-foreground">{t.profile_following || "Following"}</span>
          </div>
        </div>
      </div>

      {/* Name and Bio */}
      <div className="mt-3">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <UserDisplayName 
            userId={userId}
            maxLength={24}
            clickable={false}
            showBadges={true}
            className="font-bold text-lg"
          />
        </div>
        {stats.isFollowedBy && !isOwnProfile && (
          <span className="text-xs text-muted-foreground">{t.profile_follows_you || "Follows you"}</span>
        )}
        <p className="text-sm mt-2 text-muted-foreground">
          {bio?.trim() || t.profile_bio_placeholder}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-4">
        {isOwnProfile ? (
          <EnhancedButton
            variant="outline"
            className="flex-1 rounded-xl h-10 font-medium"
            onClick={onEditProfile || (() => navigate("/profile"))}
            lift
          >
            <Settings className="w-4 h-4 mr-2" />
            {t.settings || "Edit Profile"}
          </EnhancedButton>
        ) : (
          <>
            <EnhancedButton
              variant={isFollowing ? "outline" : "default"}
              className="flex-1 rounded-xl h-10 font-medium"
              onClick={handleToggleFollow}
              disabled={isProcessing}
              glow={!isFollowing}
              lift
            >
              {isFollowing ? (
                <>
                  <UserMinus className="w-4 h-4 mr-2" />
                  {t.profile_unfollow || "Unfollow"}
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  {t.profile_follow || "Follow"}
                </>
              )}
            </EnhancedButton>
            <EnhancedButton
              variant="outline"
              className="rounded-xl h-10"
              onClick={() => navigate(`/messages?user=${userId}`)}
              lift
            >
              <MessageCircle className="w-4 h-4" />
            </EnhancedButton>
          </>
        )}
      </div>
    </AnimatedCard>
  );
};
