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
  const { 
    upgradeSubscription, 
    downgradeSubscription, 
    cancelSubscription, 
    reactivateSubscription,
    previewSubscriptionChange,
    isLoading: actionLoading 
  } = useSubscriptionActions();
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; plan?: PlanWithInterval } | null>(null);
  const [previewData, setPreviewData] = useState<{
    amountDue: number;
    currency: string;
    prorationAmount: number;
    subtotal: number;
    total: number;
    periodEnd: number;
    lines: Array<{ description: string; amount: number; proration: boolean }>;
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

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

  const handlePreviewAndConfirm = async (plan: PlanWithInterval) => {
    // If user has no active subscription, skip preview and go to checkout
    if (!status?.currentPlan || status.currentPlan === 'free') {
      setConfirmAction({ type: 'change', plan });
      setPreviewData(null);
      setShowConfirm(true);
      return;
    }

    // For subscription changes, try to fetch preview first
    setLoadingPreview(true);
    try {
      const result = await previewSubscriptionChange(plan.priceId);
      if (result.success && result.preview) {
        setPreviewData(result.preview);
      } else {
        // If preview fails, still show dialog but without preview data
        console.warn('Preview failed:', result.error);
        setPreviewData(null);
      }
      // Always show confirmation dialog, even if preview failed
      setConfirmAction({ type: 'change', plan });
      setShowConfirm(true);
    } catch (error) {
      // On error, still show dialog but without preview
      console.warn('Preview error:', error);
      setPreviewData(null);
      setConfirmAction({ type: 'change', plan });
      setShowConfirm(true);
    } finally {
      setLoadingPreview(false);
    }
  };

  const goToStripeCheckout = async (url: string) => {
    try {
      if (window.top && window.top !== window) {
        window.top.location.href = url;
        return;
      }
    } catch {}
    const win = window.open(url, '_blank');
    if (win) return;
    window.location.href = url;
  };

  const handleChange = async (plan: PlanWithInterval) => {
    try {
      // If user has no active subscription, create a new one via billing-buy
      if (!status?.currentPlan || status.currentPlan === 'free') {
        const { data, error } = await supabase.functions.invoke('billing-buy', {
          body: { tier: plan.id, cycle: plan.interval }
        });
        if (error) throw error;
        
        // Redirect to Stripe checkout
        if (data?.url) {
          await goToStripeCheckout(data.url);
          toast.success('Redirecting to checkout...');
        }
        return;
      }

      // Determine if upgrade or downgrade
      const tierHierarchy = { free: 0, vip: 1 } as const;
      const currentLevel = tierHierarchy[status.currentPlan as keyof typeof tierHierarchy] || 0;
      const targetLevel = tierHierarchy[plan.id as keyof typeof tierHierarchy] || 0;

      // Validate edge cases
      if (currentLevel === 0) {
        toast.error('Please use checkout to create a new subscription');
        return;
      }

      if (targetLevel === 0) {
        toast.error('Please use cancel to end your subscription');
        return;
      }

      if (currentLevel === targetLevel) {
        toast.info('You are already on this plan');
        return;
      }

      // Use appropriate action based on tier change
      let result;
      if (targetLevel > currentLevel) {
        // Upgrade
        result = await upgradeSubscription(plan.priceId);
      } else {
        // Downgrade
        result = await downgradeSubscription(plan.priceId);
      }

      if (result.success) {
        await loadStatus();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(errorMessage);
    } finally {
      setShowConfirm(false);
      setPreviewData(null);
    }
  };

  const handleCancel = async () => {
    try {
      const result = await cancelSubscription();
      if (result.success) {
        await loadStatus();
      }
    } finally {
      setShowConfirm(false);
    }
  };

  const handleReactivate = async () => {
    const result = await reactivateSubscription();
    if (result.success) {
      await loadStatus();
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
                    data-testid={`action-${plan.id}`}
                    onClick={() => handlePreviewAndConfirm(plan)}
                    disabled={isCurrent || actionLoading || loadingPreview}
                    variant={isCurrent ? 'outline' : 'default'}
                    className="w-full"
                  >
                    {loadingPreview ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isCurrent ? (
                      t.subscription_your_plan
                    ) : (
                      t.subscription_actions_change
                    )}
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
            <AlertDialogDescription asChild>
              {confirmAction?.type === 'change' && confirmAction.plan ? (
                <div className="space-y-3">
                  <p>
                    {t.subscription_confirm_change_body
                      .replace('{plan}', confirmAction.plan.name)
                      .replace('{interval}', confirmAction.plan.interval)
                      .replace('{price}', confirmAction.plan.price.toString())
                      .replace('{suffix}', confirmAction.plan.interval === 'monthly' ? t.subscription_per_month_short : t.subscription_per_year_short)
                      .replace('{prorationNote}', '')}
                  </p>
                  
                  {/* Proration Preview */}
                  {previewData && (
                    <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                      <div className="font-semibold">Billing Summary:</div>
                      
                      {previewData.lines.map((line, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className={line.proration ? 'text-muted-foreground' : ''}>
                            {line.description}
                          </span>
                          <span className={line.amount < 0 ? 'text-green-600' : ''}>
                            ${(line.amount / 100).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      
                      {previewData.prorationAmount !== 0 && (
                        <div className="flex justify-between text-muted-foreground border-t pt-2">
                          <span>Proration:</span>
                          <span className={previewData.prorationAmount < 0 ? 'text-green-600' : ''}>
                            ${(previewData.prorationAmount / 100).toFixed(2)}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex justify-between font-bold border-t pt-2">
                        <span>Amount Due Today:</span>
                        <span>${(previewData.amountDue / 100).toFixed(2)}</span>
                      </div>
                      
                      <div className="text-xs text-muted-foreground pt-2">
                        Next billing: {new Date(previewData.periodEnd * 1000).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                  
                  {!previewData && (
                    <p className="text-sm text-muted-foreground">
                      {t.subscription_proration_info}
                    </p>
                  )}
                </div>
              ) : (
                t.subscription_confirm_cancel_body_period_end.replace('{date}', status?.currentPeriodEnd ? new Date(status.currentPeriodEnd).toLocaleDateString() : '')
              )}
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
