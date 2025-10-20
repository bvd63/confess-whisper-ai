import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Crown, Zap, Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from "@/lib/subscription-plans";
import { Badge } from "@/components/ui/badge";

interface SubscriptionPlansGridProps {
  currentPlan: string;
  onSelectPlan: (planId: string) => void;
  isLoading?: boolean;
  canChangePlan?: boolean;
  trialEligible?: boolean;
}

export const SubscriptionPlansGrid = ({
  currentPlan,
  onSelectPlan,
  isLoading = false,
  canChangePlan = true,
  trialEligible = false,
}: SubscriptionPlansGridProps) => {
  const { t } = useLanguage();

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'premium':
        return <Zap className="w-6 h-6" />;
      case 'vip':
        return <Crown className="w-6 h-6" />;
      default:
        return <Star className="w-6 h-6" />;
    }
  };

  const getButtonText = (plan: SubscriptionPlan) => {
    if (plan.id === currentPlan) {
      return t.subscription_current_plan;
    }
    if (plan.id === 'free') {
      return t.subscription_downgrade_to_free;
    }
    return t.subscription_change_to_plan.replace('{plan}', plan.name);
  };

  const isCurrentPlan = (planId: string) => planId === currentPlan;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {SUBSCRIPTION_PLANS.map((plan) => (
        <Card
          key={plan.id}
          className={`p-6 relative ${
            isCurrentPlan(plan.id)
              ? 'border-2 border-primary shadow-glow bg-gradient-to-br from-primary/5 to-primary/10'
              : 'border border-border'
          }`}
        >
          {/* Popular Badge */}
          {plan.isPopular && (
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-500 to-purple-500">
              {t.subscription_most_popular}
            </Badge>
          )}

          {/* Current Plan Badge */}
          {isCurrentPlan(plan.id) && (
            <Badge className="absolute -top-3 right-4 bg-gradient-to-r from-primary to-primary/80">
              {t.subscription_your_plan}
            </Badge>
          )}

          {/* Plan Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 mb-3">
              {getPlanIcon(plan.id)}
            </div>
            <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
            <div className="text-3xl font-bold">
              {plan.priceMonthly === 0 ? (
                t.subscription_free
              ) : (
                <>
                  ${plan.priceMonthly}
                  <span className="text-sm text-muted-foreground font-normal">
                    /{t.subscription_per_month}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Benefits List */}
          <div className="space-y-3 mb-6">
            {plan.benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">{t[benefit as keyof typeof t] || benefit}</span>
              </div>
            ))}
            {plan.limitations?.map((limitation, index) => (
              <div key={`lim-${index}`} className="flex items-start gap-2 opacity-60">
                <span className="text-sm">• {t[limitation as keyof typeof t] || limitation}</span>
              </div>
            ))}
          </div>

          {/* Trial Badge */}
          {trialEligible && plan.id === 'premium' && (
            <div className="mb-4 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center">
              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                {t.subscription_trial_available}
              </p>
            </div>
          )}

          {/* Action Button */}
          <Button
            onClick={() => onSelectPlan(plan.id)}
            disabled={isLoading || isCurrentPlan(plan.id) || !canChangePlan}
            className={`w-full ${
              plan.isPopular
                ? 'bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600'
                : plan.id === 'vip'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                : ''
            }`}
            variant={isCurrentPlan(plan.id) ? 'outline' : 'default'}
          >
            {getButtonText(plan)}
          </Button>
        </Card>
      ))}
    </div>
  );
};
