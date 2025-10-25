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
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; plan?: PlanWithInterval } | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('subscription-manage', {
        body: { action: 'status' }
      });
      if (error) throw error;
      setStatus(data);
      if (data.interval) setInterval(data.interval);
    } catch (error) {
      console.error('Error loading status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = async (plan: PlanWithInterval) => {
    setActionLoading(true);
    try {
      // If user has no active subscription, create a new one instead of changing
      if (!status?.currentPlan || status.currentPlan === 'free' || status.status === 'none') {
        const { data, error } = await supabase.functions.invoke('billing-buy', {
          body: { 
            tier: plan.id,
            cycle: plan.interval
          }
        });
        if (error) throw error;
        
        // Redirect to Stripe checkout
        if (data?.url) {
          window.open(data.url, '_blank');
          toast.success('Redirecting to checkout...');
        }
      } else {
        // User has active subscription, change it
        const { data, error } = await supabase.functions.invoke('subscription-manage', {
          body: { 
            action: 'change', 
            priceId: plan.priceId,
            prorationBehavior: 'create_prorations'
          }
        });
        if (error) throw error;
        toast.success(t.subscription_change_success);
        await loadStatus();
      }
    } catch (error: any) {
      toast.error(error.message || t.subscription_errors_generic);
    } finally {
      setActionLoading(false);
      setShowConfirm(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('subscription-manage', {
        body: { action: 'cancel', effective: 'period_end' }
      });
      if (error) throw error;
      toast.success(t.subscription_cancel_success);
      await loadStatus();
    } catch (error: any) {
      toast.error(error.message || t.subscription_errors_generic);
    } finally {
      setActionLoading(false);
      setShowConfirm(false);
    }
  };

  const handleReactivate = async () => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('subscription-manage', {
        body: { action: 'reactivate' }
      });
      if (error) throw error;
      toast.success(t.subscription_reactivate_success);
      await loadStatus();
    } catch (error: any) {
      toast.error(error.message || t.subscription_errors_generic);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <Loader2 className="w-6 h-6 animate-spin mx-auto" />;

  const plans = getPlansForInterval(interval);
  const isCurrentPlan = (plan: PlanWithInterval) => 
    plan.id === status?.currentPlan && plan.interval === status?.interval;

  return (
    <div className="space-y-6" data-testid="manage-subscription-modal">
      {/* Current Status */}
      {status && status.currentPlan !== 'free' && (
        <Card className="p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">{t.subscription_current_status}</h3>
              <p className="text-muted-foreground">
                {status.currentPlan.toUpperCase()} - {status.interval === 'monthly' ? t.subscription_interval_monthly : t.subscription_interval_yearly}
              </p>
              {status.currentPeriodEnd && (
                <p className="text-sm text-muted-foreground">
                  {status.cancelAtPeriodEnd ? t.subscription_cancel_ends_at : t.subscription_next_billing_date}
                  {': '}{new Date(status.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
            </div>
            <Badge variant={status.status === 'active' ? 'default' : 'secondary'}>
              {t[`subscription_status_${status.status}` as keyof typeof t] || status.status}
            </Badge>
          </div>
          {status.canReactivate && (
            <Button onClick={handleReactivate} className="mt-4 w-full" disabled={actionLoading}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t.subscription_actions_reactivate}
            </Button>
          )}
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
                    data-testid={`action-${plan.id === 'vip' && status?.currentPlan === 'free' ? 'upgrade' : 'downgrade'}`}
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
