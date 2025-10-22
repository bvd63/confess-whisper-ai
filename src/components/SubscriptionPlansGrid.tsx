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
        <div className="flex justify-center animate-fade-in">
          <div className="inline-flex rounded-xl border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-purple-500/5 p-1.5 shadow-lg">
            <button
              onClick={() => onIntervalChange('monthly')}
              className={`px-8 py-3 rounded-lg transition-all duration-300 font-semibold ${
                interval === 'monthly'
                  ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg scale-105'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              {t.subscription_interval_monthly}
            </button>
            <button
              onClick={() => onIntervalChange('yearly')}
              className={`px-8 py-3 rounded-lg transition-all duration-300 font-semibold relative ${
                interval === 'yearly'
                  ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg scale-105'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              {t.subscription_interval_yearly}
              <span className="absolute -top-2 -right-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
        {plans.map((plan: any) => (
          <Card
            key={`${plan.id}-${plan.interval}`}
            className={`p-6 relative border-2 transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
              plan.isPopular 
                ? 'border-violet-500 shadow-lg shadow-violet-500/20' 
                : plan.id === 'vip'
                ? 'border-amber-500 shadow-lg shadow-amber-500/20'
                : 'border-border hover:border-primary/50'
            }`}
          >
            {/* Popular Badge */}
            {plan.isPopular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0 shadow-lg animate-pulse px-4 py-1">
                ⭐ {t.subscription_most_popular}
              </Badge>
            )}

            {/* Savings Badge */}
            {plan.savingsPercent && plan.savingsPercent > 0 && (
              <Badge className="absolute -top-3 right-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-lg px-3 py-1">
                💰 {t.subscription_savings_badge.replace('{percent}', plan.savingsPercent.toString())}
              </Badge>
            )}


            {/* Plan Header */}
            <div className="text-center mb-6">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 transition-all duration-300 ${
                plan.isPopular 
                  ? 'bg-gradient-to-br from-violet-500 to-purple-500 shadow-lg shadow-violet-500/50' 
                  : plan.id === 'vip'
                  ? 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/50'
                  : 'bg-gradient-to-br from-primary/20 to-primary/10'
              }`}>
                <span className={plan.isPopular || plan.id === 'vip' ? 'text-white' : ''}>
                  {getPlanIcon(plan.id)}
                </span>
              </div>
              <h3 className={`text-2xl font-bold mb-3 ${
                plan.isPopular 
                  ? 'bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent' 
                  : plan.id === 'vip'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent'
                  : ''
              }`}>
                {plan.name}
              </h3>
              <div className="text-4xl font-bold">
                {plan.price === 0 ? (
                  <span className="text-2xl">{t.subscription_free}</span>
                ) : (
                  <>
                    <span className={plan.isPopular || plan.id === 'vip' ? 'bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent' : ''}>
                      ${plan.price}
                    </span>
                    <span className="text-base text-muted-foreground font-normal block mt-1">
                      {plan.interval === 'monthly' ? t.subscription_per_month_short : t.subscription_per_year_short}
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
              <div className="mb-4 p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-2 border-amber-500/30 rounded-xl text-center animate-pulse">
                <p className="text-sm text-amber-600 dark:text-amber-400 font-semibold">
                  🎁 {t.subscription_trial_available}
                </p>
              </div>
            )}

            {/* Action Button */}
            <Button
              onClick={() => onSelectPlan(plan.id, plan.priceId)}
              disabled={isLoading || !canChangePlan}
              className={`w-full transition-all duration-300 hover:scale-105 hover:shadow-xl font-semibold text-base py-6 ${
                plan.isPopular
                  ? 'bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white shadow-lg shadow-violet-500/50'
                  : plan.id === 'vip'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/50'
                  : 'hover:bg-primary/90'
              }`}
            >
              {getButtonText(plan)}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};
