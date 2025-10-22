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
    <div className="space-y-8 relative">
      {/* Background Gradient Effects */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Interval Tabs */}
      {onIntervalChange && (
        <div className="flex justify-center animate-fade-in">
          <div className="inline-flex rounded-2xl border-2 border-primary/30 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-pink-500/10 p-2 shadow-2xl backdrop-blur-xl">
            <button
              onClick={() => onIntervalChange('monthly')}
              className={`px-10 py-4 rounded-xl transition-all duration-500 font-bold text-base ${
                interval === 'monthly'
                  ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 text-white shadow-2xl shadow-violet-500/50 scale-105'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/70 hover:scale-102'
              }`}
            >
              📅 {t.subscription_interval_monthly}
            </button>
            <button
              onClick={() => onIntervalChange('yearly')}
              className={`px-10 py-4 rounded-xl transition-all duration-500 font-bold text-base relative ${
                interval === 'yearly'
                  ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 text-white shadow-2xl shadow-violet-500/50 scale-105'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/70 hover:scale-102'
              }`}
            >
              📆 {t.subscription_interval_yearly}
              <span className="absolute -top-3 -right-3 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-bounce">
                💎 Save 20%
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in">
        {plans.map((plan: any) => (
          <Card
            key={`${plan.id}-${plan.interval}`}
            className={`p-8 relative border-2 transition-all duration-500 hover:scale-[1.08] hover:-translate-y-2 group overflow-hidden ${
              plan.isPopular 
                ? 'border-violet-500 shadow-2xl shadow-violet-500/30 bg-gradient-to-br from-violet-500/5 via-purple-500/5 to-pink-500/5' 
                : plan.id === 'vip'
                ? 'border-amber-500 shadow-2xl shadow-amber-500/30 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-yellow-500/5'
                : 'border-border hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/20'
            }`}
          >
            {/* Animated glow effect */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
              plan.isPopular 
                ? 'bg-gradient-to-br from-violet-500/5 to-purple-500/5' 
                : plan.id === 'vip'
                ? 'bg-gradient-to-br from-amber-500/5 to-orange-500/5'
                : 'bg-primary/5'
            }`}></div>
            {/* Popular Badge */}
            {plan.isPopular && (
              <Badge className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 text-white border-0 shadow-2xl shadow-violet-500/50 animate-pulse px-5 py-2 text-sm font-bold z-10">
                ⭐ {t.subscription_most_popular} ⭐
              </Badge>
            )}

            {/* Savings Badge */}
            {plan.savingsPercent && plan.savingsPercent > 0 && (
              <Badge className="absolute -top-4 right-4 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white border-0 shadow-2xl shadow-green-500/50 px-4 py-2 text-sm font-bold animate-bounce z-10">
                💰 {t.subscription_savings_badge.replace('{percent}', plan.savingsPercent.toString())}
              </Badge>
            )}


            {/* Plan Header */}
            <div className="text-center mb-8 relative z-10">
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 ${
                plan.isPopular 
                  ? 'bg-gradient-to-br from-violet-600 via-purple-600 to-pink-600 shadow-2xl shadow-violet-500/50 animate-pulse' 
                  : plan.id === 'vip'
                  ? 'bg-gradient-to-br from-amber-600 via-orange-600 to-yellow-600 shadow-2xl shadow-amber-500/50 animate-pulse'
                  : 'bg-gradient-to-br from-primary/30 to-primary/10 group-hover:from-primary/40 group-hover:to-primary/20'
              }`}>
                <span className={`text-3xl ${plan.isPopular || plan.id === 'vip' ? 'text-white' : ''}`}>
                  {getPlanIcon(plan.id)}
                </span>
              </div>
              <h3 className={`text-3xl font-extrabold mb-4 tracking-tight ${
                plan.isPopular 
                  ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 bg-clip-text text-transparent' 
                  : plan.id === 'vip'
                  ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-600 bg-clip-text text-transparent'
                  : ''
              }`}>
                {plan.name}
              </h3>
              <div className="space-y-2">
                {plan.price === 0 ? (
                  <span className="text-3xl font-bold">{t.subscription_free}</span>
                ) : (
                  <>
                    <div className={`text-5xl font-black tracking-tight ${
                      plan.isPopular || plan.id === 'vip' 
                        ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 bg-clip-text text-transparent' 
                        : ''
                    }`}>
                      ${plan.price}
                    </div>
                    <div className="text-sm text-muted-foreground font-semibold">
                      {plan.interval === 'monthly' ? t.subscription_per_month_short : t.subscription_per_year_short}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Benefits List */}
            <div className="space-y-4 mb-8 relative z-10">
              {plan.benefits.map((benefit: string, index: number) => (
                <div key={index} className="flex items-start gap-3 group/benefit">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 group-hover/benefit:scale-110 ${
                    plan.isPopular || plan.id === 'vip'
                      ? 'bg-gradient-to-br from-violet-500 to-purple-500 shadow-lg shadow-violet-500/30'
                      : 'bg-primary/20'
                  }`}>
                    <Check className={`w-4 h-4 ${plan.isPopular || plan.id === 'vip' ? 'text-white' : 'text-primary'}`} />
                  </div>
                  <span className="text-sm font-medium leading-relaxed group-hover/benefit:translate-x-1 transition-transform duration-300">
                    {t[benefit as keyof typeof t] || benefit}
                  </span>
                </div>
              ))}
              {plan.limitations?.map((limitation: string, index: number) => (
                <div key={`lim-${index}`} className="flex items-start gap-3 opacity-50">
                  <span className="text-sm">• {t[limitation as keyof typeof t] || limitation}</span>
                </div>
              ))}
            </div>

            {/* Trial Badge */}
            {trialEligible && plan.id === 'premium' && plan.interval === 'monthly' && (
              <div className="mb-6 p-4 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-yellow-500/20 border-2 border-amber-500/50 rounded-2xl text-center animate-pulse shadow-lg shadow-amber-500/30 relative z-10 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-orange-500/10 animate-pulse"></div>
                <p className="text-base text-amber-600 dark:text-amber-400 font-bold relative z-10">
                  🎁 {t.subscription_trial_available} 🎁
                </p>
              </div>
            )}

            {/* Action Button */}
            <Button
              onClick={() => onSelectPlan(plan.id, plan.priceId)}
              disabled={isLoading || !canChangePlan}
              className={`w-full relative overflow-hidden transition-all duration-500 hover:scale-110 hover:shadow-2xl font-bold text-lg py-7 rounded-xl z-10 group/button ${
                plan.isPopular
                  ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-700 hover:via-purple-700 hover:to-pink-700 text-white shadow-2xl shadow-violet-500/50'
                  : plan.id === 'vip'
                  ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-600 hover:from-amber-700 hover:via-orange-700 hover:to-yellow-700 text-white shadow-2xl shadow-amber-500/50'
                  : 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-xl'
              }`}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover/button:translate-x-[100%] transition-transform duration-1000"></span>
              <span className="relative z-10">{getButtonText(plan)}</span>
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};
