import { AlertCircle, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface RateLimitIndicatorProps {
  remaining: number;
  total: number;
  resetTime?: string;
  isLimited: boolean;
  className?: string;
}

export const RateLimitIndicator = ({
  remaining,
  total,
  resetTime,
  isLimited,
  className,
}: RateLimitIndicatorProps) => {
  const { t } = useLanguage();
  const percentage = (remaining / total) * 100;

  if (isLimited) {
    return (
      <div className={cn("p-3 rounded-lg border bg-destructive/10 border-destructive/20", className)}>
        <div className="flex items-center gap-2 text-destructive mb-2">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-semibold">{t.rate_limit_title}</span>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          {t.rate_limit_wait_message}
        </p>
        {resetTime && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{t.rate_limit_reset_in.replace('{time}', resetTime)}</span>
          </div>
        )}
      </div>
    );
  }

  // Show warning when below 20%
  const showWarning = percentage < 20;

  return (
    <div className={cn("p-3 rounded-lg border bg-background/50", 
      showWarning ? "border-amber-500/20 bg-amber-500/5" : "border-border/50",
      className
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">
          {t.rate_limit_remaining}
        </span>
        <span className={cn(
          "text-xs font-semibold",
          showWarning ? "text-amber-500" : "text-foreground"
        )}>
          {remaining}/{total}
        </span>
      </div>
      <Progress 
        value={percentage} 
        className={cn(
          "h-2",
          showWarning && "[&>div]:bg-amber-500"
        )}
      />
      {resetTime && (
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {t.rate_limit_reset_in.replace('{time}', resetTime)}
        </p>
      )}
    </div>
  );
};
