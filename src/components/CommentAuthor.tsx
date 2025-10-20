import { useUserDisplayName } from "@/hooks/useUserDisplayName";
import { SubscriptionBadge } from "./SubscriptionBadge";
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
      {showBadge && subscriptionTier !== 'free' && (
        <SubscriptionBadge tier={subscriptionTier} />
      )}
    </div>
  );
};
