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
    <div className="space-y-4">
      {/* Current Plan Card */}
      <Card className="p-4 rounded-2xl glass-card border border-border/50">
        <h3 className="text-base font-bold text-foreground">
          {t.manage_sub_current_plan_free}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t.manage_sub_current_plan_desc}
        </p>
      </Card>

      {/* VIP Plan Card */}
      {filteredPlans.map((plan: any) => (
        <Card
          key={`${plan.id}-${plan.interval}`}
          className="relative rounded-2xl overflow-hidden border border-primary/40 bg-gradient-to-br from-primary/10 via-card to-primary/5"
          style={{ boxShadow: '0 0 20px hsl(var(--primary) / 0.15), inset 0 1px 0 hsl(var(--primary) / 0.1)' }}
        >
          {/* Inner content */}
          <div className="p-4">
            {/* Top row: VIP Plan label + crown icon */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">{t.manage_sub_vip_plan}</h3>
                {/* Pricing */}
                <div className="mt-1">
                  <span className="text-3xl font-bold text-foreground">
                    €{interval === 'yearly' ? (plan.price / 12).toFixed(2) : plan.price.toFixed(2)}
                  </span>
                  <span className="text-muted-foreground text-sm ml-1">/month</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {interval === 'yearly' 
                    ? `€${plan.price.toFixed(2)}/year`
                    : ''
                  }
                </p>
              </div>
              {/* Crown VIP badge */}
              <div className="flex flex-col items-center gap-0.5 mt-1">
                <Crown className="w-7 h-7 text-primary" />
                <span className="text-[10px] font-bold text-primary tracking-wide">VIP</span>
              </div>
            </div>

            {/* Benefits label */}
            <p className="text-sm font-semibold text-muted-foreground mb-2">{t.manage_sub_benefits}</p>

            {/* Benefits list — compact */}
            <div className="space-y-1.5 mb-4">
              {plan.benefits.map((benefit: string, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span className="text-sm text-foreground/90 leading-tight">{getStringTranslation(t, benefit) || benefit}</span>
                </div>
              ))}
            </div>

            {/* Debug Warning */}
            {!plan.priceId && plan.id !== 'free' && (
              <div className="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-500 text-xs font-medium">
                  ⚠️ Price ID missing
                </p>
              </div>
            )}
          </div>

          {/* Upgrade Button — full width, outside inner padding for edge-to-edge feel */}
          <div className="px-4 pb-4">
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
              className="w-full py-3 rounded-full font-semibold transition-all duration-300 bg-gradient-to-r from-primary to-primary/70 hover:from-primary/90 hover:to-primary/60 text-primary-foreground disabled:opacity-50"
            >
              {(currentPlan === 'vip' && plan.id === 'vip')
                ? (portalLoading ? '...' : 'Manage Subscription') 
                : isCurrentPlan(plan) 
                  ? (portalLoading ? '...' : 'Manage Subscription') 
                  : t.manage_sub_upgrade_to_vip}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
};
