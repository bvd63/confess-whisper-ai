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

  const handleSelectPlan = async (planId: string, priceId: string) => {
    if (!priceId) return;
    if (planId === currentPlan && interval === currentInterval) return;

    setIsProcessing(true);
    try {
      const levels = { free: 0, premium: 1, vip: 2 } as const;
      const cur = levels[(currentPlan as keyof typeof levels) || 'free'] ?? 0;
      const tgt = levels[(planId as keyof typeof levels) || 'free'] ?? 0;

      if (cur === 0) {
        const { data, error } = await supabase.functions.invoke('create-checkout-session', {
          body: { priceId, planName: planId, billingCycle: interval },
        });
        if (error) throw error;
        if (data?.url) {
          window.open(data.url, '_blank');
          toast.success('Redirecting to checkout...');
          onOpenChange(false);
        }
        return;
      }

      if (tgt > cur || (tgt === cur && interval !== currentInterval)) {
        const { data, error } = await supabase.functions.invoke('billing-upgrade', {
          body: { newPriceId: priceId },
        });
        if (error) throw error;

        toast.success(t.webhookLag || 'Upgrade received. Syncing your account…');
        
        await loadSubscriptionStatus();
        
        const end = Date.now() + 10000;
        while (Date.now() < end) {
          await new Promise(r => setTimeout(r, 1000));
          await loadSubscriptionStatus();
          if (currentPlan === planId) break;
        }
        
        onOpenChange(false);
        onSubscriptionUpdated?.();
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
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto animate-fade-in border-2 border-primary/20 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none"></div>
        <DialogHeader className="space-y-4 relative z-10 pb-6 border-b border-primary/10">
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl">✨</span>
            <DialogTitle className="text-4xl font-black bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 bg-clip-text text-transparent tracking-tight">
              {t.subscription_title}
            </DialogTitle>
            <span className="text-4xl">✨</span>
          </div>
          <p className="text-muted-foreground text-center text-lg font-medium max-w-2xl mx-auto">
            {t.subscription_description || "Choose the perfect plan for your needs and unlock premium features"}
          </p>
        </DialogHeader>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-6">
            <div className="relative">
              <Loader2 className="w-16 h-16 animate-spin text-primary" />
              <div className="absolute inset-0 w-16 h-16 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
            </div>
            <p className="text-base text-muted-foreground font-semibold">Loading amazing plans...</p>
          </div>
        ) : (
          <div className="animate-scale-in relative z-10 pt-6">
            <SubscriptionPlansGrid
              currentPlan={currentPlan}
              currentInterval={currentInterval}
              onSelectPlan={handleSelectPlan}
              isLoading={isProcessing}
              canChangePlan={true}
              interval={interval}
              onIntervalChange={setInterval}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
