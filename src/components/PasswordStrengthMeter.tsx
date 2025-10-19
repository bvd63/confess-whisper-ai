import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface PasswordStrengthMeterProps {
  strength: 'weak' | 'fair' | 'good' | 'strong';
  strengthScore: number;
}

export const PasswordStrengthMeter = ({ strength, strengthScore }: PasswordStrengthMeterProps) => {
  const { t } = useLanguage();

  const strengthColors = {
    weak: 'bg-destructive',
    fair: 'bg-orange-500',
    good: 'bg-yellow-500',
    strong: 'bg-green-500',
  };

  const strengthTextColors = {
    weak: 'text-destructive',
    fair: 'text-orange-500',
    good: 'text-yellow-500',
    strong: 'text-green-500',
  };

  const strengthLabels = {
    weak: t.auth_password_strength_weak,
    fair: t.auth_password_strength_fair,
    good: t.auth_password_strength_good,
    strong: t.auth_password_strength_strong,
  };

  const percentage = (strengthScore / 5) * 100;

  return (
    <div className="space-y-2" role="status" aria-live="polite">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{t.auth_password_rules_title.replace(':', '')}</span>
        <span className={cn("font-medium", strengthTextColors[strength])}>
          {strengthLabels[strength]}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-300 ease-out rounded-full",
            strengthColors[strength]
          )}
          style={{ width: `${percentage}%` }}
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
};
