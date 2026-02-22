import { Crown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface UpgradeBannerProps {
  /** If on trial, pass days remaining. Null = free user without trial */
  daysRemaining: number | null;
  isOnTrial: boolean;
  onUpgrade: () => void;
}

export const UpgradeBanner = ({ daysRemaining, isOnTrial, onUpgrade }: UpgradeBannerProps) => {
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem('upgrade_banner_dismissed') === 'true';
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem('upgrade_banner_dismissed', 'true');
    setDismissed(true);
  };

  return (
    <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-b border-primary/20">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Crown className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              {isOnTrial && daysRemaining !== null ? (
                <>
                  <p className="text-sm font-semibold text-foreground">
                    <span className={cn(
                      daysRemaining <= 2 && "text-destructive animate-pulse"
                    )}>
                      {daysRemaining} {daysRemaining === 1 ? "day" : "days"}
                    </span>
                    {" "}left in your VIP trial
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Upgrade now to keep your VIP features
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-foreground">
                    Unlock VIP features
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Upgrade to VIP for premium features and an enhanced experience
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={onUpgrade}
              className="gap-2 font-semibold"
            >
              <Crown className="w-4 h-4" />
              Upgrade to VIP
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={handleDismiss}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Backwards compatibility
export const TrialBanner = UpgradeBanner;
