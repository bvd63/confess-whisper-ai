import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
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
    return <Crown className="w-5 h-5 text-primary" />;
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
    <div className="space-y-3">
      {/* Current Plan Card — iOS system settings style */}
      <div className="rounded-xl bg-card/80 backdrop-blur-sm border border-border/40 p-4">
        <h3 className="text-[15px] font-semibold text-foreground">
          {t.manage_sub_current_plan_free}
        </h3>
        <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">
          {t.manage_sub_current_plan_desc}
        </p>
      </div>

      {/* VIP Plan Card — iOS system style, no glow/gradient */}
      {filteredPlans.map((plan: any) => (
        <div
          key={`${plan.id}-${plan.interval}`}
          className="rounded-xl bg-card/80 backdrop-blur-sm border border-border/40"
        >
          <div className="p-4">
            {/* Header row */}
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[15px] font-semibold text-foreground">{t.manage_sub_vip_plan}</h3>
              <Crown className="w-5 h-5 text-primary" />
            </div>

            {/* Pricing — clean, no color */}
            <div className="mb-3">
              <span className="text-2xl font-bold text-foreground">
                €{interval === 'yearly' ? (plan.price / 12).toFixed(2) : plan.price.toFixed(2)}
              </span>
              <span className="text-muted-foreground text-[13px] ml-1">/ month</span>
              {interval === 'yearly' && (
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  €{plan.price.toFixed(2)} / year
                </p>
              )}
            </div>

            {/* Benefits — plain text list, iOS description style */}
            <div className="space-y-1 mb-4">
              {plan.benefits.map((benefit: string, index: number) => (
                <p key={index} className="text-[13px] text-muted-foreground leading-snug">
                  {getStringTranslation(t, benefit) || benefit}
                </p>
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

            {/* CTA — only element with brand accent */}
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
              className="w-full h-11 rounded-full font-semibold text-[15px] bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {(currentPlan === 'vip' && plan.id === 'vip')
                ? (portalLoading ? '...' : t.manage_subscription_title) 
                : isCurrentPlan(plan) 
                  ? (portalLoading ? '...' : t.manage_subscription_title) 
                  : t.manage_sub_upgrade_to_vip}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
