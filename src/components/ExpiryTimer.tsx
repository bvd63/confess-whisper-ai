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
  const { days, hours, isExpired } = useTimeRemaining(expiresAt);

  if (!expiresAt) return null;

  if (isExpired) {
    return (
      <div className={cn("flex items-center gap-1 text-destructive text-xs", className)}>
        {showIcon && <AlertCircle className="w-3 h-3" />}
        <span className="font-medium">{t.badge_expired}</span>
      </div>
    );
  }

  // Calculate total hours instead of showing days separately
  const totalHours = (days * 24) + hours;
  
  return (
    <div className={cn("flex items-center gap-1 text-muted-foreground text-xs", className)}>
      {showIcon && <Clock className="w-3 h-3" />}
      <span>
        {t.badge_expires_in}: {totalHours}h
      </span>
    </div>
  );
};
