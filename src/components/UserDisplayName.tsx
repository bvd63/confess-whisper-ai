import { memo } from 'react';
import { useUserDisplayName } from '@/hooks/useUserDisplayName';
import { truncateNickname } from '@/lib/displayName';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface UserDisplayNameProps {
  userId: string | null | undefined;
  className?: string;
  maxLength?: number;
  clickable?: boolean;
  showTooltip?: boolean;
}

/**
 * Component to display user nickname with proper fallbacks
 * Shows @nickname if available, otherwise "Anonymous"
 * Supports truncation, tooltips, and clickable navigation to profile
 */
export const UserDisplayName = memo(({ 
  userId, 
  className = '', 
  maxLength = 24,
  clickable = true,
  showTooltip = true,
}: UserDisplayNameProps) => {
  const { displayName, loading } = useUserDisplayName(userId);
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
        'font-medium',
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
