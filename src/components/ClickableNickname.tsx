import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { BadgeDisplay } from "@/components/BadgeDisplay";
import { useVipStatus } from "@/hooks/usePremiumStatus";

interface ClickableNicknameProps {
  userId: string;
  nickname?: string | null;
  className?: string;
  showIcon?: boolean;
  showBadges?: boolean;
}

/**
 * Clickable nickname component that navigates to user profile
 */
export const ClickableNickname = ({ 
  userId, 
  nickname, 
  className,
  showIcon = false,
  showBadges = true
}: ClickableNicknameProps) => {
  const navigate = useNavigate();
  const { subscriptionTier } = useVipStatus(userId);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/user/${userId}`);
  };

  if (!nickname) return null;

  return (
    <div className="inline-flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        className={cn(
          "h-auto p-1 font-semibold hover:text-primary transition-colors",
          className
        )}
      >
        {showIcon && <User className="w-3 h-3 mr-1" />}
        @{nickname}
      </Button>
      {showBadges && (
        <BadgeDisplay 
          userId={userId}
          subscriptionTier={subscriptionTier as "free" | "vip"}
          showSubscription={subscriptionTier !== 'free'}
          variant="compact"
          maxBadges={2}
        />
      )}
    </div>
  );
};
