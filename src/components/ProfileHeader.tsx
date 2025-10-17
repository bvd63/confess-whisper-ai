import { Button } from "@/components/ui/button";
import { MessageCircle, UserPlus, UserMinus, Settings } from "lucide-react";
import { useFollowSystem } from "@/hooks/useFollowSystem";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProfileHeaderProps {
  userId: string;
  currentUserId: string | null;
  nickname: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  confessionsCount: number;
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
}: ProfileHeaderProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { stats, isProcessing, toggleFollow } = useFollowSystem(currentUserId, userId);
  
  const isOwnProfile = currentUserId === userId;
  const displayName = nickname || t.confession_anonymous;

  return (
    <div className="flex flex-col gap-4 p-4 border-b border-border/50">
      {/* Avatar and Stats Row */}
      <div className="flex items-center gap-4">
        <Avatar className="w-20 h-20 border-2 border-primary/20">
          <AvatarImage src={avatarUrl || undefined} alt={displayName} />
          <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary/20 to-primary/10">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 flex justify-around">
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold">{confessionsCount}</span>
            <span className="text-xs text-muted-foreground">{t.profile_posts || "Posts"}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold">{stats.followers}</span>
            <span className="text-xs text-muted-foreground">{t.profile_followers || "Followers"}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold">{stats.following}</span>
            <span className="text-xs text-muted-foreground">{t.profile_following || "Following"}</span>
          </div>
        </div>
      </div>

      {/* Name and Bio */}
      <div>
        <h2 className="font-bold text-lg">@{displayName}</h2>
        {stats.isFollowedBy && !isOwnProfile && (
          <span className="text-xs text-muted-foreground">{t.profile_follows_you || "Follows you"}</span>
        )}
        {bio && <p className="text-sm mt-2 text-muted-foreground">{bio}</p>}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {isOwnProfile ? (
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate("/settings")}
          >
            <Settings className="w-4 h-4 mr-2" />
            {t.settings || "Edit Profile"}
          </Button>
        ) : (
          <>
            <Button
              variant={stats.isFollowing ? "outline" : "default"}
              className="flex-1"
              onClick={toggleFollow}
              disabled={isProcessing}
            >
              {stats.isFollowing ? (
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
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/messages?user=${userId}`)}
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
