import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/translated-dialog";
import { Crown } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { SubscriptionPlansGrid } from "./SubscriptionPlansGrid";
import { getPriceIdForTier } from "@/lib/stripe-config";
import type { BillingCycle } from "@/lib/stripe-config";
import { logError } from "@/lib/logger";

interface SubscriptionPlansProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}


const SubscriptionPlans = ({ open, onOpenChange }: SubscriptionPlansProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentTier, setCurrentTier] = useState("free");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    if (open) {
      loadCurrentSubscription();
    }
  }, [open]);

  const loadCurrentSubscription = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, trial_active, trial_end_date')
      .eq('user_id', user.id)
      .single();
    
    if (profile) {
      // If user is on active trial, treat them as VIP for UI purposes
      const trialValid = profile.trial_active && profile.trial_end_date && new Date(profile.trial_end_date) > new Date();
      const tier = trialValid ? 'vip' : (profile.subscription_tier || 'free');
      setCurrentTier(tier);
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
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: t.reaction_auth_required,
          description: t.reaction_auth_required_desc,
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('billing-buy', {
        body: { 
          tier: planId,
          cycle: billingCycle
        },
      });

      if (error) throw error;

      if (data?.url) {
        toast({
          title: t.common_success,
          description: "Redirecting to checkout...",
        });
        await goToStripeCheckout(data.url);
      }
    } catch (error) {
      logError('Error creating checkout session', error as Error);
      toast({
        title: t.common_error,
        description: t.subscription_payment_error_desc,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto bg-background border-border/50 rounded-[20px]">
        <DialogHeader className="space-y-4 pb-2">
          <DialogTitle className="text-3xl flex items-center gap-3 justify-center font-bold">
            <Crown className="w-8 h-8 text-[#FFD700]" />
            {t.plans_paywall_title || "Your Subscription"}
          </DialogTitle>
          <DialogDescription className="text-base text-center text-muted-foreground px-4 leading-relaxed">
            {t.plans_paywall_subtitle || "Compare features and find your best experience."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-8">
          <SubscriptionPlansGrid
            currentPlan={currentTier}
            currentInterval={billingCycle}
            onSelectPlan={handleSelectPlan}
            isLoading={isLoading}
            canChangePlan={true}
            interval={billingCycle}
            onIntervalChange={setBillingCycle}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionPlans;