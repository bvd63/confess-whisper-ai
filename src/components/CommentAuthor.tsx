import { useUserDisplayName } from "@/hooks/useUserDisplayName";
import { BadgeDisplay } from "./BadgeDisplay";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

interface CommentAuthorProps {
  userId: string;
  showBadge?: boolean;
}

export const CommentAuthor = ({ userId, showBadge = true }: CommentAuthorProps) => {
  const { displayName } = useUserDisplayName(userId);
  const { subscriptionTier } = usePremiumStatus(userId);

  return (
    <div className="flex items-center gap-1.5">
      <span className="font-medium">{displayName}</span>
      {showBadge && (
        <BadgeDisplay 
          userId={userId} 
          subscriptionTier={subscriptionTier as "free" | "premium" | "vip"}
          showSubscription={subscriptionTier !== 'free'}
          variant="compact"
          maxBadges={2}
        />
      )}
    </div>
  );
};
