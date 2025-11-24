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
        <div className="flex justify-center px-4">
          <div className="inline-flex rounded-xl bg-card border border-border p-1 gap-1 w-full max-w-sm">
            <button
              onClick={() => onIntervalChange('monthly')}
              className={`flex-1 px-6 py-3 rounded-lg transition-all font-semibold ${
                interval === 'monthly'
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              📅 Monthly
            </button>
            <button
              onClick={() => onIntervalChange('yearly')}
              className={`flex-1 px-6 py-3 rounded-lg transition-all font-semibold relative ${
                interval === 'yearly'
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🎯 Yearly
              <span className="absolute -top-2 -right-2 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full font-bold shadow-lg">
                💰 -34%
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Plans Grid - Centered for single VIP plan */}
      <div className="flex justify-center px-4">
        <div className="w-full max-w-md">
          {filteredPlans.map((plan: any) => (
            <Card
              key={`${plan.id}-${plan.interval}`}
              className={`p-6 sm:p-8 relative bg-card border transition-all duration-300 hover:scale-[1.02] rounded-2xl ${
                plan.id === 'vip'
                  ? 'border-primary/30 hover:border-primary/50 shadow-xl hover:shadow-2xl'
                  : 'border-border hover:border-primary/30 shadow-lg'
              }`}
            >
            {/* Active Badge for VIP if current plan */}
            {isCurrentPlan(plan) && (
              <Badge className="absolute -top-3 left-4 bg-primary text-primary-foreground px-3 py-1 font-semibold shadow-lg">
                ✅ Active
              </Badge>
            )}

            {/* Savings Badge with glow */}
            {interval === 'yearly' && (
              <div className="absolute -top-3 -right-3">
                <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full animate-pulse-glow"></div>
                <Badge className="relative bg-green-600 text-white px-3 py-1 font-bold shadow-lg">
                  💰 Save ~34%
                </Badge>
              </div>
            )}


            {/* Plan Header */}
            <div className="mb-6 sm:mb-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className="text-4xl sm:text-5xl animate-bounce-gentle">{plan.id === 'vip' ? '👑' : '⭐'}</span>
                <h3 className="text-2xl sm:text-3xl font-bold text-foreground">{plan.name}</h3>
              </div>
              <div className="mb-2">
                <span className="text-4xl sm:text-5xl font-bold text-foreground">
                  ${interval === 'yearly' ? (plan.price / 12).toFixed(2) : plan.price}
                </span>
                <span className="text-muted-foreground text-base sm:text-lg ml-2">/month</span>
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                {interval === 'yearly' 
                  ? `💳 Billed annually ($${plan.price.toFixed(2)}/year)`
                  : '💳 Billed monthly'
                }
              </p>
            </div>

            {/* Benefits List */}
            <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
              {plan.benefits.map((benefit: string, index: number) => (
                <div key={index} className="flex items-start gap-3 group/benefit">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover/benefit:bg-primary/30 transition-all group-hover/benefit:scale-110">
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-sm text-foreground/90 leading-relaxed">{getStringTranslation(t, benefit) || benefit}</span>
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
                // If user has VIP (regardless of interval), open portal to manage/change subscription
                if (currentPlan === 'vip' && plan.id === 'vip') {
                  handleOpenPortal();
                } else if (isCurrentPlan(plan)) {
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
                (isLoading || !canChangePlan || (plan.id !== 'free' && !plan.priceId)) && !(currentPlan === 'vip' && plan.id === 'vip') || 
                portalLoading
              }
              className="w-full h-12 sm:h-14 rounded-xl font-bold text-base transition-all duration-300 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
            >
              {(currentPlan === 'vip' && plan.id === 'vip')
                ? (portalLoading ? '⏳ Opening Portal...' : '⚙️ Manage Subscription') 
                : isCurrentPlan(plan) 
                  ? (portalLoading ? '⏳ Opening Portal...' : '⚙️ Manage Subscription') 
                  : getButtonText(plan)}
            </Button>
          </Card>
        ))}
        </div>
      </div>
    </div>
  );
};
