import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getPlansForInterval, type BillingInterval, type PlanWithInterval } from "@/lib/subscription-plans";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSubscriptionActions } from "@/hooks/useSubscriptionActions";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getPriceIdForTier } from "@/lib/stripe-config";

interface SubscriptionStatus {
  currentPlan: string;
  interval: BillingInterval | null;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd?: string;
  canReactivate: boolean;
  priceId?: string;
}

export const EnhancedSubscriptionManager = () => {
  const { t } = useLanguage();
  const { user } = useCurrentUser();
  const { upgradeSubscription, downgradeSubscription, isLoading: actionLoading } = useSubscriptionActions();
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; plan?: PlanWithInterval } | null>(null);

  useEffect(() => {
    loadStatus();
  }, [user]);

  const loadStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Prefer the billing-status Edge Function when available (tests mock this)
      try {
        const { data: fnData, error: fnError } = await supabase.functions.invoke('billing-status');
        if (!fnError && fnData) {
          // Map function return shape to SubscriptionStatus if needed
          const payload = fnData as any;
          const statusData: SubscriptionStatus = {
            currentPlan: (payload.currentPlan || payload.subscription_tier || 'free') as string,
            interval: (payload.interval as BillingInterval) || (payload.subscription_interval as BillingInterval) || 'monthly',
            status: payload.status || payload.subscription_status || 'inactive',
            cancelAtPeriodEnd: !!payload.cancelAtPeriodEnd || !!payload.subscription_cancel_at_period_end,
            currentPeriodEnd: payload.currentPeriodEnd || payload.subscription_ends_at || undefined,
            canReactivate: !!payload.canReactivate,
            priceId: payload.priceId || undefined,
          };

          setStatus(statusData);
          setInterval(statusData.interval || 'monthly');
          setLoading(false);
          return;
        }
      } catch (err) {
        // ignore and fall back to profiles table
      }

      // Fallback: Fetch subscription status from profiles (legacy / DB source)
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status, subscription_ends_at, stripe_subscription_id, is_premium')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && (error as any).code !== 'PGRST116') throw error;

      // Determine interval from subscription_ends_at or stripe_subscription_id
      let detectedInterval: BillingInterval = 'monthly';
      if (profile?.stripe_subscription_id) {
        const subId = profile.stripe_subscription_id || '';
        if (subId.includes('yearly') || subId.includes('annual')) {
          detectedInterval = 'yearly';
        }
      }

      const isActive = profile?.subscription_ends_at 
        ? new Date(profile.subscription_ends_at) > new Date()
        : false;

      const statusData: SubscriptionStatus = {
        currentPlan: (profile?.subscription_tier || 'free') as string,
        interval: detectedInterval,
        status: isActive && profile?.subscription_status === 'active' ? 'active' : profile?.subscription_status || 'inactive',
        cancelAtPeriodEnd: false,
        currentPeriodEnd: profile?.subscription_ends_at || undefined,
        canReactivate: false,
        priceId: undefined,
      };

      setStatus(statusData);
      setInterval(detectedInterval);
    } catch (error) {
      console.error('Error loading status:', error);
      toast.error(t.subscription_error || 'Failed to load subscription status');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = async (plan: PlanWithInterval) => {
    try {
      // Use the priceId from the selected plan directly
      const targetPriceId = plan.priceId;
      if (!targetPriceId) {
        toast.error('Invalid plan configuration');
        return;
      }

      // If user has no active subscription, create a new one
      if (!status?.currentPlan || status.currentPlan === 'free') {
        const { data, error } = await supabase.functions.invoke('create-checkout-session', {
          body: { priceId: targetPriceId, planName: plan.id, billingCycle: plan.interval }
        });
        if (error) throw error;
        
        // Redirect to Stripe checkout
        if (data?.url) {
          window.open(data.url, '_blank');
          toast.success('Redirecting to checkout...');
        }
        return;
      }

      // Determine if upgrade or downgrade
      const tierHierarchy = { free: 0, premium: 1, vip: 2 } as const;
      const currentLevel = tierHierarchy[status.currentPlan as keyof typeof tierHierarchy] || 0;
      const targetLevel = tierHierarchy[plan.id as keyof typeof tierHierarchy] || 0;

      toast.loading(t.processing_request);

      if (targetLevel !== currentLevel) {
        // Use a single billing-change function (tests mock this) which handles both upgrades and downgrades
        const { data, error } = await supabase.functions.invoke('billing-change', {
          body: { targetPriceId }
        });
        if (error) throw error;
        toast.dismiss();
        // If returned data indicates success, show corresponding message
        toast.success(targetLevel > currentLevel ? t.upgrade_success : t.downgrade_scheduled_next_period);
      }

      await loadStatus();
      toast.success(t.request_done);
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || t.subscription_errors_generic);
    } finally {
      setShowConfirm(false);
    }
  };

  const handleCancel = async () => {
    try {
      toast.loading(t.processing_request);
      
      const { data, error } = await supabase.functions.invoke('billing-cancel');
      if (error) throw error;
      
      toast.dismiss();
      toast.success(t.cancel_scheduled);
      await loadStatus();
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || t.subscription_errors_generic);
    } finally {
      setShowConfirm(false);
    }
  };

  const handleReactivate = async () => {
    try {
      toast.loading(t.processing_request);

      const { data, error } = await supabase.functions.invoke('billing-reactivate');
      if (error) throw error;

      toast.dismiss();
      toast.success(t.subscription_reactivate_success || 'Subscription reactivated');
      await loadStatus();
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || t.subscription_errors_generic);
    }
  };

  if (loading) return <Loader2 className="w-6 h-6 animate-spin mx-auto" />;

  const plans = getPlansForInterval(interval);
  const isCurrentPlan = (plan: PlanWithInterval) => 
    plan.id === status?.currentPlan && plan.interval === status?.interval;

  return (
    <div className="space-y-6" data-testid="manage-subscription-modal">
      {/* Current Status */}
      {status && status.currentPlan && status.currentPlan !== 'free' && (
        <Card className="p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">{t.subscription_current_status}</h3>
              <p className="text-muted-foreground">
                {status.currentPlan?.toUpperCase() || 'UNKNOWN'} - {status.interval === 'monthly' ? t.subscription_interval_monthly : t.subscription_interval_yearly}
              </p>
              {status.currentPeriodEnd && (
                <p className="text-sm text-muted-foreground">
                  {status.cancelAtPeriodEnd ? t.subscription_cancel_ends_at : t.subscription_next_billing_date}
                  {': '}{new Date(status.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
            </div>
            <Badge variant={status.status === 'active' ? 'default' : 'secondary'}>
              {status.status ? (t[`subscription_status_${status.status}` as keyof typeof t] || status.status.toUpperCase()) : 'UNKNOWN'}
            </Badge>
          </div>
        </Card>
      )}

      {/* Interval Toggle */}
      <Tabs value={interval} onValueChange={(v) => setInterval(v as BillingInterval)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="monthly">{t.subscription_interval_monthly}</TabsTrigger>
          <TabsTrigger value="yearly">{t.subscription_interval_yearly}</TabsTrigger>
        </TabsList>

        <TabsContent value={interval} className="mt-6">
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = isCurrentPlan(plan);
              return (
                <Card key={`${plan.id}-${plan.interval}`} className={`p-6 ${isCurrent ? 'border-primary' : ''}`}>
                  <div className="text-center mb-4">
                    {plan.isPopular && <Badge className="mb-2">{t.subscription_most_popular}</Badge>}
                    {isCurrent && <Badge variant="outline" className="mb-2">{t.subscription_your_plan}</Badge>}
                    <h3 className="text-2xl font-bold">{plan.name}</h3>
                    <div className="text-3xl font-bold mt-2">
                      ${plan.price}
                      <span className="text-sm text-muted-foreground">
                        {plan.interval === 'monthly' ? t.subscription_per_month_short : t.subscription_per_year_short}
                      </span>
                    </div>
                    {plan.savingsPercent && plan.savingsPercent > 0 && (
                      <Badge variant="secondary" className="mt-2">
                        {t.subscription_savings_badge.replace('{percent}', plan.savingsPercent.toString())}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2 mb-6">
                    {plan.benefits.map((benefit, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{t[benefit as keyof typeof t] || benefit}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    data-testid={`action-${plan.id === 'premium' && status?.currentPlan === 'free' ? 'upgrade' : plan.id === 'vip' && status?.currentPlan === 'premium' ? 'upgrade' : 'downgrade'}`}
                    onClick={() => {
                      setConfirmAction({ type: 'change', plan });
                      setShowConfirm(true);
                    }}
                    disabled={isCurrent || actionLoading}
                    variant={isCurrent ? 'outline' : 'default'}
                    className="w-full"
                  >
                    {isCurrent ? t.subscription_your_plan : t.subscription_actions_change}
                  </Button>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Cancel Button */}
      {status && status.currentPlan !== 'free' && !status.cancelAtPeriodEnd && (
        <Button
          data-testid="action-cancel"
          variant="destructive"
          onClick={() => {
            setConfirmAction({ type: 'cancel' });
            setShowConfirm(true);
          }}
          disabled={actionLoading}
          className="w-full"
        >
          {t.subscription_actions_cancel}
        </Button>
      )}

      {/* Reactivate Button (shown when subscription is canceled but can be reactivated) */}
      {status && (status.status === 'canceled' || status.cancelAtPeriodEnd) && status.canReactivate && (
        <Button data-testid="action-reactivate" variant="default" onClick={handleReactivate} className="w-full">
          {t.subscription_actions_reactivate}
        </Button>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'change' ? t.subscription_confirm_change_title : t.subscription_confirm_cancel_title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'change' && confirmAction.plan
                ? t.subscription_confirm_change_body
                    .replace('{plan}', confirmAction.plan.name)
                    .replace('{interval}', confirmAction.plan.interval)
                    .replace('{price}', confirmAction.plan.price.toString())
                    .replace('{suffix}', confirmAction.plan.interval === 'monthly' ? t.subscription_per_month_short : t.subscription_per_year_short)
                    .replace('{prorationNote}', t.subscription_proration_info)
                : t.subscription_confirm_cancel_body_period_end.replace('{date}', status?.currentPeriodEnd ? new Date(status.currentPeriodEnd).toLocaleDateString() : '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>{t.common_close}</AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-action"
              onClick={() => confirmAction?.type === 'change' && confirmAction.plan ? handleChange(confirmAction.plan) : handleCancel()}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t.common_success}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
