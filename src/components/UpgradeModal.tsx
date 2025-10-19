import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/translated-dialog";
import { EnhancedButton } from "@/components/EnhancedButton";
import { Crown, X, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import SubscriptionPlans from "./SubscriptionPlans";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: string;
  currentCount: number;
  dailyLimit: number;
}

export const UpgradeModal = ({ 
  open, 
  onOpenChange,
  currentTier,
  currentCount,
  dailyLimit 
}: UpgradeModalProps) => {
  const { t } = useLanguage();
  const [showPlans, setShowPlans] = useState(false);

  const getTimeUntilMidnight = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const diff = midnight.getTime() - now.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  if (showPlans) {
    return (
      <SubscriptionPlans 
        open={open} 
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setShowPlans(false);
          }
          onOpenChange(isOpen);
        }} 
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-strong border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl flex items-center gap-2">
            <Crown className="w-6 h-6 text-primary" />
            {t.limit_reached_title}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t.limit_reached_description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Status */}
          <div className="p-4 glass rounded-lg border border-border/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{t.limit_current_plan}</span>
              <span className="text-sm font-medium capitalize">{currentTier}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t.limit_used_today}</span>
              <span className="text-sm font-medium">{currentCount}/{dailyLimit}</span>
            </div>
          </div>

          {/* Reset Time */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{t.limit_resets_in}: {getTimeUntilMidnight()}</span>
          </div>

          {/* Upgrade Benefits */}
          <div className="space-y-2">
            <p className="text-sm font-medium">{t.limit_upgrade_benefits}</p>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                <span>{t.plans_premium_benefit_confessions}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                <span>{t.plans_vip_benefit_confessions}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <EnhancedButton
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              {t.common_close}
            </EnhancedButton>
            <EnhancedButton
              onClick={() => setShowPlans(true)}
              className="flex-1"
              glow
              shine
            >
              <Crown className="w-4 h-4 mr-2" />
              {t.limit_see_plans}
            </EnhancedButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
