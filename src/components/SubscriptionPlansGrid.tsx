import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Crown, Zap, Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { getPlansForInterval } from "@/lib/subscription-plans";

interface SubscriptionPlansGridProps {
  currentPlan: string;
  currentInterval?: 'monthly' | 'yearly';
  onSelectPlan: (planId: string, priceId: string) => void;
  isLoading?: boolean;
  canChangePlan?: boolean;
  trialEligible?: boolean;
  interval: 'monthly' | 'yearly';
  onIntervalChange?: (interval: 'monthly' | 'yearly') => void;
}

export const SubscriptionPlansGrid = ({
  currentPlan,
  currentInterval,
  onSelectPlan,
  isLoading = false,
  canChangePlan = true,
  trialEligible = false,
  interval,
  onIntervalChange,
}: SubscriptionPlansGridProps) => {
  const { t } = useLanguage();
  
  const plans = getPlansForInterval(interval);

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

  const getButtonText = (plan: any) => {
    // Always show "Choose [Plan]" regardless of current subscription
    if (plan.id === 'free') {
      return t.subscription_downgrade_to_free;
    }
    return t.subscription_choose_plan.replace('{plan}', plan.name);
  };

  const isCurrentPlan = (plan: any) => plan.id === currentPlan && plan.interval === currentInterval;

  return (
    <div className="space-y-6">
      {/* Interval Tabs */}
      {onIntervalChange && (
        <div className="flex justify-center">
          <div className="inline-flex rounded-lg border bg-muted p-1">
            <button
              onClick={() => onIntervalChange('monthly')}
              className={`px-6 py-2 rounded-md transition-colors ${
                interval === 'monthly'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.subscription_interval_monthly}
            </button>
            <button
              onClick={() => onIntervalChange('yearly')}
              className={`px-6 py-2 rounded-md transition-colors relative ${
                interval === 'yearly'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.subscription_interval_yearly}
              {interval === 'yearly' && (
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                  Save 20%
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan: any) => (
          <Card
            key={`${plan.id}-${plan.interval}`}
            className={`p-6 relative border transition-all duration-200 hover:shadow-lg ${
              plan.isPopular 
                ? 'border-primary shadow-md' 
                : plan.id === 'vip'
                ? 'border-amber-500/50'
                : 'border-border'
            }`}
          >
            {/* Popular Badge */}
            {plan.isPopular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                {t.subscription_most_popular}
              </Badge>
            )}

            {/* Savings Badge */}
            {plan.savingsPercent && plan.savingsPercent > 0 && (
              <Badge className="absolute -top-3 right-4 bg-green-500 text-white">
                {t.subscription_savings_badge.replace('{percent}', plan.savingsPercent.toString())}
              </Badge>
            )}


            {/* Plan Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                {getPlanIcon(plan.id)}
              </div>
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <div className="text-3xl font-bold">
                {plan.price === 0 ? (
                  t.subscription_free
                ) : (
                  <>
                    ${plan.price}
                    <span className="text-sm text-muted-foreground font-normal">
                      /{plan.interval === 'monthly' ? t.subscription_per_month_short : t.subscription_per_year_short}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Benefits List */}
            <div className="space-y-3 mb-6">
              {plan.benefits.map((benefit: string, index: number) => (
                <div key={index} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{t[benefit as keyof typeof t] || benefit}</span>
                </div>
              ))}
              {plan.limitations?.map((limitation: string, index: number) => (
                <div key={`lim-${index}`} className="flex items-start gap-2 opacity-60">
                  <span className="text-sm">• {t[limitation as keyof typeof t] || limitation}</span>
                </div>
              ))}
            </div>

            {/* Trial Badge */}
            {trialEligible && plan.id === 'premium' && plan.interval === 'monthly' && (
              <div className="mb-4 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center">
                <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                  {t.subscription_trial_available}
                </p>
              </div>
            )}

            {/* Action Button */}
            <Button
              onClick={() => onSelectPlan(plan.id, plan.priceId)}
              disabled={isLoading || !canChangePlan}
              variant={plan.isPopular ? 'default' : 'outline'}
              className="w-full"
            >
              {getButtonText(plan)}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};
