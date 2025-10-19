import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { AnimatedCard } from "./AnimatedCard";

interface TrialBannerProps {
  trialEndDate: string;
}

export const TrialBanner = ({ trialEndDate }: TrialBannerProps) => {
  const { t } = useLanguage();
  
  const daysRemaining = Math.ceil(
    (new Date(trialEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <AnimatedCard className="mb-4">
      <Alert className="border-amber-500/50 bg-gradient-to-r from-amber-500/10 to-yellow-500/10">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-amber-500 animate-pulse-glow" />
          <div className="flex-1">
            <AlertDescription className="text-sm font-medium">
              {t.trial_banner_title || '🎉 Premium Trial Active'}
            </AlertDescription>
            <AlertDescription className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Clock className="h-3 w-3" />
              {t.trial_banner_days_remaining?.replace('{days}', daysRemaining.toString()) || 
                `${daysRemaining} days remaining`}
            </AlertDescription>
          </div>
        </div>
      </Alert>
    </AnimatedCard>
  );
};