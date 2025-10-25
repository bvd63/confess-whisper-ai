import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { SubscriptionPlansGrid } from "./SubscriptionPlansGrid";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ManageSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubscriptionUpdated?: () => void;
}

export const ManageSubscriptionDialog = ({ open, onOpenChange, onSubscriptionUpdated }: ManageSubscriptionDialogProps) => {
  const { t } = useLanguage();
  const { user } = useCurrentUser();
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [currentInterval, setCurrentInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadSubscriptionStatus();
    }
  }, [open, user]);

  const loadSubscriptionStatus = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier, stripe_subscription_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profile) {
        setCurrentPlan(profile.subscription_tier || 'free');
        // Detect interval from subscription ID
        const detectedInterval = profile.stripe_subscription_id?.includes('year') ? 'yearly' : 'monthly';
        setCurrentInterval(detectedInterval);
        setInterval(detectedInterval);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
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

  const handleSelectPlan = async (planId: string, priceId: string) => {
    if (!priceId) return;
    if (planId === currentPlan && interval === currentInterval) return;

    setIsProcessing(true);
    try {
      // If target is VIP, prefer opening the Stripe Customer Portal first
      if (planId === 'vip') {
        try {
          const { data, error } = await supabase.functions.invoke('customer-portal');
          if (!error && data?.url) {
            toast.success('Deschidem portalul de facturare…');
            await goToStripeCheckout(data.url);
            return;
          }
        } catch (e) {
          console.warn('customer-portal VIP pre-check failed, will fallback', e);
        }
      }

      const levels = { free: 0, vip: 1 } as const;
      const cur = levels[(currentPlan as keyof typeof levels) || 'free'] ?? 0;
      const tgt = levels[(planId as keyof typeof levels) || 'free'] ?? 0;

      if (cur === 0) {
        // New subscription - use billing-buy
        const { data, error } = await supabase.functions.invoke('billing-buy', {
          body: { tier: planId, cycle: interval },
        });
        if (error) throw error;
        if (data?.url) {
          await goToStripeCheckout(data.url);
          toast.success('Redirecting to checkout...');
          onOpenChange(false);
        }
        return;
      }

      if (tgt > cur || (tgt === cur && interval !== currentInterval)) {
        // Try Stripe Customer Portal first (best UX for upgrades/interval changes)
        try {
          const { data, error } = await supabase.functions.invoke('customer-portal');
          if (!error && data?.url) {
            toast.success('Deschidem portalul de facturare…');
            await goToStripeCheckout(data.url);
            return;
          }
        } catch (e) {
          console.warn('customer-portal failed, fallback to checkout', e);
        }

        // Fallback: direct upgrade checkout session
        const { data: upData, error: upErr } = await supabase.functions.invoke('billing-upgrade', {
          body: { newPriceId: priceId },
        });
        if (upErr) throw upErr;
        if (upData?.url) {
          toast.success(t.webhookLag || 'Upgrade inițiat. Redirecționare…');
          await goToStripeCheckout(upData.url);
          onOpenChange(false);
          onSubscriptionUpdated?.();
        }
        return;
      }

      if (tgt < cur) {
        const { error } = await supabase.functions.invoke('subscription-downgrade', {
          body: { targetPriceId: priceId },
        });
        if (error) throw error;
        toast.success(t.downgrade_scheduled_next_period || 'Downgrade scheduled');
        onOpenChange(false);
        return;
      }
    } catch (error: any) {
      console.error('Error processing subscription change:', error);
      const msg = error?.message || t.subscription_errors_generic || t.upgradeFailed || 'An error occurred';
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-[#0a0b14] border-[#1a1b2e] text-white">
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-center justify-center gap-2 text-2xl font-semibold text-white">
            <span className="text-purple-500">👑</span>
            {t.subscription_title}
          </DialogTitle>
          <p className="text-center text-sm text-gray-400">
            Compare features and find your best experience.
          </p>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : (
          <>
            <SubscriptionPlansGrid
              currentPlan={currentPlan}
              currentInterval={currentInterval}
              onSelectPlan={handleSelectPlan}
              isLoading={isProcessing}
              canChangePlan={true}
              interval={interval}
              onIntervalChange={setInterval}
            />
            <p className="text-center text-xs text-gray-500 mt-6">
              You can cancel anytime from account settings. No long-term commitments.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
