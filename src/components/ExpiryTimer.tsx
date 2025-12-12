import { Clock, AlertCircle } from "lucide-react";
import { useTimeRemaining } from "@/hooks/useTimeRemaining";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface ExpiryTimerProps {
  expiresAt: string | null;
  className?: string;
  showIcon?: boolean;
}

export const ExpiryTimer = ({ expiresAt, className, showIcon = true }: ExpiryTimerProps) => {
  const { t } = useLanguage();
  const { isExpired, totalMs } = useTimeRemaining(expiresAt);

  if (!expiresAt) return null;

  if (isExpired) {
    return (
      <div className={cn("flex items-center gap-1 text-destructive text-xs", className)}>
        {showIcon && <AlertCircle className="w-3 h-3" />}
        <span className="font-medium">{t.badge_expired}</span>
      </div>
    );
  }

  const totalHours = Math.ceil(totalMs / (1000 * 60 * 60));
  const showDays = totalHours > 24;
  const daysRemaining = Math.max(1, Math.ceil(totalHours / 24));
  const hoursRemaining = Math.max(1, totalHours);
  const displayText = showDays
    ? `${daysRemaining} ${t.days}`
    : `${hoursRemaining}${t.time_hours || 'h'}`;
  
  return (
    <div className={cn("flex items-center gap-1 text-muted-foreground text-xs", className)}>
      {showIcon && <Clock className="w-3 h-3" />}
      <span>
        {t.badge_expires_in}: {displayText}
      </span>
    </div>
  );
};
