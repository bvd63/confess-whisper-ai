import { Check, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { PasswordRule } from "@/hooks/usePasswordValidation";
import { getStringTranslation } from "@/lib/translationUtils";

interface PasswordRulesChecklistProps {
  rules: Array<PasswordRule & { passed: boolean }>;
}

export const PasswordRulesChecklist = ({ rules }: PasswordRulesChecklistProps) => {
  const { t } = useLanguage();

  return (
    <div 
      className="space-y-1.5" 
      role="list" 
      aria-label={t.auth_password_rules_title}
    >
      {rules.map((rule) => (
        <div
          key={rule.id}
          className={cn(
            "flex items-center gap-2 text-xs transition-colors duration-200",
            rule.passed ? "text-green-600 dark:text-green-500" : "text-muted-foreground"
          )}
          role="listitem"
          aria-label={`${t[rule.translationKey as keyof typeof t]} - ${rule.passed ? 'passed' : 'not passed'}`}
        >
          <div
            className={cn(
              "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-200",
              rule.passed
                ? "bg-green-500/20 dark:bg-green-500/30"
                : "bg-muted"
            )}
          >
            {rule.passed ? (
              <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
            ) : (
              <X className="w-3 h-3 text-muted-foreground" />
            )}
          </div>
          <span>{getStringTranslation(t, rule.translationKey)}</span>
        </div>
      ))}
    </div>
  );
};
