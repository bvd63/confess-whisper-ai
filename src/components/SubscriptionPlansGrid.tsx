import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Crown, Zap, Star, Loader2 } from "lucide-react";
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
    <div className="space-y-6 sm:space-y-8">
      {/* Interval Tabs - Responsive */}
      {onIntervalChange && (
        <div className="flex justify-center">
          <div className="inline-flex w-full max-w-sm rounded-2xl bg-muted/30 p-1 sm:p-1.5">
            <button
              onClick={() => onIntervalChange('monthly')}
              className={`flex-1 px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl transition-all duration-300 font-bold text-xs sm:text-sm ${
                interval === 'monthly'
                  ? 'bg-background text-foreground shadow-ios scale-[1.02]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => onIntervalChange('yearly')}
              className={`flex-1 px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl transition-all duration-300 font-bold text-xs sm:text-sm relative ${
                interval === 'yearly'
                  ? 'bg-background text-foreground shadow-ios scale-[1.02]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              Yearly
              <span className="absolute -top-2 -right-2 sm:-top-2.5 sm:-right-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-bold shadow-ios animate-pulse">
                💰 34%
              </span>
            </button>
          </div>
        </div>
      )}

      {/* VIP Plan Card - Centered and Responsive */}
      <div className="flex justify-center px-2 sm:px-0">
        <div className="w-full max-w-lg">
          {filteredPlans.map((plan: any) => (
            <Card
              key={`${plan.id}-${plan.interval}`}
              className={`p-6 sm:p-8 relative bg-card border-border/50 transition-all duration-300 hover:scale-[1.01] rounded-3xl shadow-card hover:shadow-elevated ${
                plan.id === 'vip'
                  ? 'border-primary/30 hover:border-primary/50 ring-2 ring-primary/10'
                  : 'hover:border-primary/30'
              }`}
            >
            {/* Active Badge - Responsive positioning */}
            {isCurrentPlan(plan) && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 sm:px-4 py-1 sm:py-1.5 font-bold text-xs sm:text-sm rounded-full shadow-elevated">
                  ⭐ Your Plan
                </Badge>
              </div>
            )}

            {/* Savings Badge - Better mobile positioning */}
            {interval === 'yearly' && !isCurrentPlan(plan) && (
              <div className="absolute -top-3 -right-2 sm:-right-3 z-10">
                <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-2.5 sm:px-3 py-1 sm:py-1.5 font-bold text-xs rounded-full shadow-elevated animate-pulse">
                  💰 Save 34%
                </Badge>
              </div>
            )}

            {/* Plan Header - Responsive typography */}
            <div className="mb-6 sm:mb-8">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <span className="text-3xl sm:text-4xl">👑</span>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground">{plan.name}</h3>
              </div>
              <div className="mb-2">
                <span className="text-4xl sm:text-5xl font-bold text-foreground">
                  ${interval === 'yearly' ? (plan.price / 12).toFixed(2) : plan.price}
                </span>
                <span className="text-muted-foreground text-base sm:text-lg ml-2">/month</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                {interval === 'yearly' 
                  ? `Billed annually ($${plan.price.toFixed(2)}/year)`
                  : 'Billed monthly'
                }
              </p>
            </div>

            {/* Benefits List - Responsive spacing */}
            <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
              {plan.benefits.map((benefit: string, index: number) => (
                <div key={index} className="flex items-start gap-2.5 sm:gap-3 group/benefit">
                  <div className="w-5 h-5 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover/benefit:bg-primary/20 transition-all shadow-ios">
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-medium">{getStringTranslation(t, benefit) || benefit}</span>
                </div>
              ))}
            </div>

            {/* Debug Warning - visible only when price ID is missing */}
            {!plan.priceId && plan.id !== 'free' && (
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <p className="text-yellow-600 text-xs font-bold">
                  ⚠️ Configuration Issue
                </p>
                <p className="text-yellow-600/70 text-xs mt-1">
                  Price ID missing for {plan.id}
                </p>
              </div>
            )}

            {/* Action Button - Fully responsive */}
            <Button
              onClick={() => {
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
              className="w-full h-12 sm:h-14 rounded-2xl font-bold text-sm sm:text-base transition-all duration-300 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-elevated hover:shadow-ios hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
            >
              {portalLoading && (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
              )}
              {(currentPlan === 'vip' && plan.id === 'vip')
                ? (portalLoading ? 'Opening...' : '⚙️ Manage Subscription') 
                : isCurrentPlan(plan) 
                  ? (portalLoading ? 'Opening...' : '⚙️ Manage Subscription') 
                  : getButtonText(plan)}
            </Button>
          </Card>
        ))}
        </div>
      </div>
    </div>
  );
};
