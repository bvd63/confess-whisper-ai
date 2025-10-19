import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { SubscriptionBadge } from "./SubscriptionBadge";
import { useLanguage } from "@/contexts/LanguageContext";

interface CommentAuthorProps {
  userId: string;
  showBadge?: boolean;
}

export const CommentAuthor = ({ userId, showBadge = true }: CommentAuthorProps) => {
  const { subscriptionTier } = usePremiumStatus(userId);
  const { t } = useLanguage();

  return (
    <div className="flex items-center gap-1.5">
      <span>{t.confession_anonymous}</span>
      {showBadge && (
        <SubscriptionBadge 
          tier={subscriptionTier as 'free' | 'premium' | 'vip'} 
          variant="inline" 
          showTooltip={true}
        />
      )}
    </div>
  );
};