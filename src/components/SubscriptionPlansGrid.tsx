import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Crown, Zap, Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { getPlansForInterval } from "@/lib/subscription-plans";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getStringTranslation } from "@/lib/translationUtils";
import { logDebug, logError, logWarn } from "@/lib/logger";
import { env } from "@/lib/env";
import { newIdempotencyKey } from "@/lib/idempotency";

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
  const { toast } = useToast();
  const [portalLoading, setPortalLoading] = useState(false);
  
  const plans = getPlansForInterval(interval);

  const handleOpenPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('No portal URL received');
      }
    } catch (error) {
      logError('Portal error', error);
      toast({
        title: "Error",
        description: "Failed to open customer portal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
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

  const handleCheckout = async (priceId: string) => {
    logDebug('🔍 Stripe Checkout Debug', {
      priceId,
      hasValue: !!priceId,
      length: priceId?.length || 0,
      interval
    });

    if (!priceId) {
      toast({
        title: "Configuration Error",
        description: "Stripe price ID missing. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to subscribe",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
        headers: {
          'Idempotency-Key': newIdempotencyKey()
        }
      });

      if (error) throw error;

      if (data?.hasActiveSubscription) {
        toast({
          title: "Active Subscription",
          description: "You already have an active subscription. Opening portal to manage it...",
        });
        // Redirect to customer portal
        const { data: portalData } = await supabase.functions.invoke('customer-portal');
        if (portalData?.url) {
          window.open(portalData.url, '_blank');
        }
        return;
      }
      
      if (data?.url) {
        try {
          if (window.top && window.top !== window) {
            window.top.location.href = data.url;
            return;
          }
        } catch {}
        const win = window.open(data.url, '_blank');
        if (win) return;
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      logError('Checkout error', error as Error);
      toast({
        title: "Error",
        description: "Failed to create checkout session. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Show only VIP plans (hide Free)
  const filteredPlans = plans.filter(plan => plan.id !== 'free');

  return (
    <div className="space-y-8">
      {/* Interval Tabs */}
      {onIntervalChange && (
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-xl bg-gradient-to-br from-[#13141f] to-[#1a1b2e] p-1.5 gap-1.5 border border-purple-500/20 shadow-lg shadow-purple-500/10">
            <button
              onClick={() => onIntervalChange('monthly')}
              className={`px-10 py-3 rounded-lg transition-all duration-300 font-semibold text-base ${
                interval === 'monthly'
                  ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/30 scale-105'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => onIntervalChange('yearly')}
              className={`px-10 py-3 rounded-lg transition-all duration-300 font-semibold text-base relative ${
                interval === 'yearly'
                  ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/30 scale-105'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Yearly
              <span className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-xs px-2.5 py-1 rounded-full font-bold shadow-lg shadow-purple-500/30 animate-pulse">
                -34%
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Plans Grid - Centered for single VIP plan */}
      <div className="flex justify-center">
        <div className="w-full max-w-md animate-fade-in">
          {filteredPlans.map((plan: any) => (
            <Card
              key={`${plan.id}-${plan.interval}`}
              className={`p-8 relative bg-gradient-to-br from-[#13141f] to-[#1a1b2e] border transition-all duration-300 hover:scale-[1.02] ${
                plan.id === 'vip'
                  ? 'border-purple-500/30 hover:border-purple-500/50 hover:shadow-[0_0_40px_rgba(168,85,247,0.2)]'
                  : 'border-[#1a1b2e] hover:border-purple-500/30 hover:shadow-[0_0_20px_rgba(168,85,247,0.1)]'
              }`}
            >
            {/* Active Badge for VIP if current plan */}
            {isCurrentPlan(plan) && (
              <Badge className="absolute -top-3 left-4 bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-1.5 font-medium shadow-lg shadow-purple-500/30 animate-fade-in">
                Active
              </Badge>
            )}

            {/* Savings Badge with glow */}
            {interval === 'yearly' && (
              <div className="absolute -top-3 -right-3 animate-scale-in">
                <div className="absolute inset-0 bg-purple-600/40 blur-2xl rounded-full"></div>
                <Badge className="relative bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white px-4 py-1.5 font-semibold shadow-lg shadow-purple-500/30">
                  -34%
                </Badge>
              </div>
            )}


            {/* Plan Header */}
            <div className="mb-10 text-center">
              <div className="flex items-center justify-center gap-3 mb-6">
                <span className="text-4xl animate-scale-in">{plan.id === 'vip' ? '👑' : '✨'}</span>
                <h3 className="text-3xl font-bold text-white animate-fade-in">{plan.name}</h3>
              </div>
              <div className="mb-3">
                <span className="text-6xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                  ${interval === 'yearly' ? (plan.price / 12).toFixed(2) : plan.price}
                </span>
                <span className="text-gray-400 text-xl ml-2">/per month</span>
              </div>
              <p className="text-sm text-gray-400 font-medium">
                {interval === 'yearly' 
                  ? `Billed annually ($${plan.price.toFixed(2)}/year)`
                  : 'Billed monthly'
                }
              </p>
            </div>

            {/* Benefits List */}
            <div className="space-y-4 mb-10">
              {plan.benefits.map((benefit: string, index: number) => (
                <div key={index} className="flex items-start gap-3 group/benefit animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500/30 to-fuchsia-500/30 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover/benefit:from-purple-500/40 group-hover/benefit:to-fuchsia-500/40 transition-all duration-300 group-hover/benefit:scale-110">
                    <Check className="w-4 h-4 text-purple-300 group-hover/benefit:text-purple-200 transition-colors" />
                  </div>
                  <span className="text-base text-white/90 leading-relaxed group-hover/benefit:text-white transition-colors">{getStringTranslation(t, benefit) || benefit}</span>
                </div>
              ))}
            </div>

            {/* Debug Warning - visible only when price ID is missing */}
            {!plan.priceId && plan.id !== 'free' && (
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-500 text-xs font-medium">
                  ⚠️ Configuration Issue: Price ID missing
                </p>
                <p className="text-yellow-400/70 text-xs mt-1">
                  Expected: price_1XXX... | Got: "{plan.priceId}"
                </p>
              </div>
            )}

            {/* Action Button */}
            <Button
              onClick={() => {
                if (isCurrentPlan(plan)) {
                  handleOpenPortal();
                } else if (plan.id === 'free') {
                  onSelectPlan(plan.id, '');
                } else {
                  if (!plan.priceId) {
                    logWarn(`Price ID missing for ${plan.id} - ${interval}`, { planId: plan.id, interval });
                  }
                  handleCheckout(plan.priceId);
                }
              }}
              disabled={
                (isLoading || !canChangePlan || (plan.id !== 'free' && !plan.priceId)) && !isCurrentPlan(plan) || 
                portalLoading
              }
              className="w-full py-6 rounded-lg font-semibold transition-all duration-300 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 disabled:hover:from-purple-600 disabled:hover:to-fuchsia-600 disabled:hover:shadow-none disabled:scale-100"
            >
              {isCurrentPlan(plan) 
                ? (portalLoading ? 'Opening Portal...' : 'Manage Subscription') 
                : getButtonText(plan)}
            </Button>
          </Card>
        ))}
        </div>
      </div>
    </div>
  );
};
