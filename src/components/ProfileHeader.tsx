import { useState } from "react";
import { EnhancedButton } from "@/components/EnhancedButton";
import { AnimatedCard } from "@/components/AnimatedCard";
import { UserDisplayName } from "@/components/UserDisplayName";
import { GiftCoinsDialog } from "@/components/coins/GiftCoinsDialog";
import { MessageCircle, UserPlus, UserMinus, Settings, Gift } from "lucide-react";
import { useFollowSystem } from "@/hooks/useFollowSystem";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

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
  const { stats, isProcessing, toggleFollow } = useFollowSystem(currentUserId, userId);
  const [isGiftDialogOpen, setIsGiftDialogOpen] = useState(false);
  
  const isOwnProfile = currentUserId === userId;

  // Tier-based visual styles - simplified since badges are now in UserDisplayName
  const tierStyles = {
    cardClass: "",
    avatarClass: "border-2 border-primary/20",
    glowClass: "",
  };

  return (
    <AnimatedCard hover="lift" glass className={cn("p-4 border-b border-border/50", tierStyles.cardClass)}>
      {/* Avatar and Stats Row */}
      <div className="flex items-center gap-4">
          <Avatar className={cn("w-20 h-20 shadow-glow", tierStyles.avatarClass, tierStyles.glowClass)}>
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
        {bio && <p className="text-sm mt-2 text-muted-foreground">{bio}</p>}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {isOwnProfile ? (
          <EnhancedButton
            variant="outline"
            className="flex-1"
            onClick={onEditProfile || (() => navigate("/profile"))}
            lift
          >
            <Settings className="w-4 h-4 mr-2" />
            {t.settings || "Edit Profile"}
          </EnhancedButton>
        ) : (
          <>
            <EnhancedButton
              variant={stats.isFollowing ? "outline" : "default"}
              className="flex-1"
              onClick={toggleFollow}
              disabled={isProcessing}
              glow={!stats.isFollowing}
              lift
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
            </EnhancedButton>
            <EnhancedButton
              variant="outline"
              onClick={() => navigate(`/messages?user=${userId}`)}
              lift
            >
              <MessageCircle className="w-4 h-4" />
            </EnhancedButton>
            <EnhancedButton
              variant="outline"
              onClick={() => setIsGiftDialogOpen(true)}
              lift
              glow
            >
              <Gift className="w-4 h-4" />
            </EnhancedButton>
          </>
        )}
      </div>

      <GiftCoinsDialog
        open={isGiftDialogOpen}
        onOpenChange={setIsGiftDialogOpen}
        recipientId={userId}
        recipientName={nickname || "User"}
      />
    </AnimatedCard>
  );
};
