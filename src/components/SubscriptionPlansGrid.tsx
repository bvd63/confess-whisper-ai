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

  // Filter to show only Premium and VIP plans
  const filteredPlans = plans.filter(plan => plan.id === 'premium' || plan.id === 'vip');

  return (
    <div className="space-y-8">
      {/* Interval Tabs */}
      {onIntervalChange && (
        <div className="flex justify-center">
          <div className="inline-flex rounded-lg bg-[#13141f] p-1 gap-1">
            <button
              onClick={() => onIntervalChange('monthly')}
              className={`px-8 py-2.5 rounded-lg transition-all font-medium ${
                interval === 'monthly'
                  ? 'bg-[#1a1b2e] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => onIntervalChange('yearly')}
              className={`px-8 py-2.5 rounded-lg transition-all font-medium relative ${
                interval === 'yearly'
                  ? 'bg-[#1a1b2e] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Yearly
              <span className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                -33%
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredPlans.map((plan: any) => (
          <Card
            key={`${plan.id}-${plan.interval}`}
            className={`p-8 relative bg-[#13141f] border transition-all duration-200 ${
              plan.id === 'vip'
                ? 'border-purple-500/30'
                : 'border-[#1a1b2e]'
            }`}
          >
            {/* Active Badge for VIP if current plan */}
            {isCurrentPlan(plan) && (
              <Badge className="absolute -top-3 left-4 bg-purple-600/90 text-white px-3 py-1 font-medium">
                Active
              </Badge>
            )}

            {/* Savings Badge with glow */}
            {interval === 'yearly' && (
              <div className="absolute -top-3 -right-3">
                <div className="absolute inset-0 bg-purple-600/30 blur-xl rounded-full"></div>
                <Badge className="relative bg-purple-600 text-white px-3 py-1 font-semibold">
                  -33%
                </Badge>
              </div>
            )}


            {/* Plan Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{plan.id === 'vip' ? '✨' : '👑'}</span>
                <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
              </div>
              <div className="mb-2">
                <span className="text-4xl font-bold text-purple-400">${plan.price}</span>
                <span className="text-gray-400 ml-1">/per month</span>
              </div>
              <p className="text-sm text-gray-500">
                Billed annually (${(plan.price * 12).toFixed(2)}/per year)
              </p>
            </div>

            {/* Benefits List */}
            <div className="space-y-3 mb-8">
              {plan.benefits.map((benefit: string, index: number) => (
                <div key={index} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-300">{t[benefit as keyof typeof t] || benefit}</span>
                </div>
              ))}
            </div>

            {/* Action Button */}
            <Button
              onClick={() => onSelectPlan(plan.id, plan.priceId)}
              disabled={isLoading || !canChangePlan || isCurrentPlan(plan)}
              className={`w-full py-6 rounded-lg font-semibold transition-all ${
                isCurrentPlan(plan)
                  ? 'bg-purple-600 hover:bg-purple-600 text-white cursor-default'
                  : plan.id === 'vip'
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-transparent border-2 border-white hover:bg-white text-white hover:text-black'
              }`}
            >
              {isCurrentPlan(plan) ? 'Active Plan' : getButtonText(plan)}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};
