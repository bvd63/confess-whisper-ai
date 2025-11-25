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
        <div className="flex justify-center">
          <div className="inline-flex rounded-xl bg-muted/50 p-1 gap-1">
            <button
              onClick={() => onIntervalChange('monthly')}
              className={`px-8 py-3 rounded-lg transition-all font-medium ${
                interval === 'monthly'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => onIntervalChange('yearly')}
              className={`px-8 py-3 rounded-lg transition-all font-medium relative ${
                interval === 'yearly'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Yearly
              <span className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs px-2.5 py-0.5 rounded-full font-bold">
                -34%
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Plans Grid - Centered for single VIP plan */}
      <div className="flex justify-center">
        <div className="w-full max-w-md">
          {filteredPlans.map((plan: any) => (
            <Card
              key={`${plan.id}-${plan.interval}`}
              className={`p-8 relative bg-card border-2 transition-all duration-300 hover:scale-[1.02] rounded-2xl ${
                plan.id === 'vip'
                  ? 'border-purple-500/30 hover:border-purple-500/50 shadow-lg'
                  : 'border-border hover:border-purple-500/30'
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
                  Save ~34%
                </Badge>
              </div>
            )}


            {/* Plan Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-4xl">{plan.id === 'vip' ? '👑' : '✨'}</span>
                <h3 className="text-2xl font-bold">{plan.name}</h3>
              </div>
              <div className="mb-2">
                <span className="text-5xl font-bold">
                  ${interval === 'yearly' ? (plan.price / 12).toFixed(2) : plan.price}
                </span>
                <span className="text-muted-foreground text-lg ml-2">/month</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {interval === 'yearly' 
                  ? `$${plan.price.toFixed(2)}/year (billed annually)`
                  : 'Billed monthly'
                }
              </p>
            </div>

            {/* Benefits List */}
            <div className="space-y-4 mb-8">
              {plan.benefits.map((benefit: string, index: number) => (
                <div key={index} className="flex items-start gap-3 group/benefit">
                  <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover/benefit:bg-purple-500/30 transition-colors">
                    <Check className="w-4 h-4 text-purple-400" />
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
              className="w-full py-6 rounded-xl font-semibold transition-all duration-300 bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-[1.02] disabled:opacity-50 disabled:scale-100"
            >
              {(currentPlan === 'vip' && plan.id === 'vip')
                ? (portalLoading ? 'Opening Portal...' : 'Manage Subscription') 
                : isCurrentPlan(plan) 
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
