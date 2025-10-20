import { memo } from 'react';
import { useUserDisplayName } from '@/hooks/useUserDisplayName';
import { truncateNickname } from '@/lib/displayName';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BadgeDisplay } from '@/components/BadgeDisplay';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';

interface UserDisplayNameProps {
  userId: string | null | undefined;
  className?: string;
  maxLength?: number;
  clickable?: boolean;
  showTooltip?: boolean;
  showBadges?: boolean;
}

/**
 * Component to display user nickname with proper fallbacks
 * Shows @nickname if available, otherwise "Anonymous"
 * Supports truncation, tooltips, clickable navigation to profile, and badges
 */
export const UserDisplayName = memo(({ 
  userId, 
  className = '', 
  maxLength = 24,
  clickable = true,
  showTooltip = true,
  showBadges = true,
}: UserDisplayNameProps) => {
  const { displayName, loading } = useUserDisplayName(userId);
  const { subscriptionTier } = usePremiumStatus(userId || null);
  const navigate = useNavigate();

  if (loading || !userId) {
    return <span className={cn('text-muted-foreground', className)}>{displayName}</span>;
  }

  const truncated = truncateNickname(displayName, maxLength);
  const needsTooltip = showTooltip && truncated !== displayName;

  const handleClick = () => {
    if (clickable && userId) {
      navigate(`/profile/${userId}`);
    }
  };

  const content = (
    <span
      className={cn(
        'font-medium inline-flex items-center gap-1',
        clickable && 'cursor-pointer hover:underline',
        className
      )}
      onClick={handleClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (clickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={displayName}
    >
      {truncated}
      {showBadges && userId && (
        <BadgeDisplay 
          userId={userId}
          subscriptionTier={subscriptionTier as "free" | "premium" | "vip"}
          showSubscription={subscriptionTier !== 'free'}
          variant="compact"
          maxBadges={2}
        />
      )}
    </span>
  );

  if (needsTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent>
            <p>{displayName}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
});

UserDisplayName.displayName = 'UserDisplayName';
