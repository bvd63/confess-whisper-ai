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
    if (!priceId || planId === currentPlan) return;

    setIsProcessing(true);
    try {
      // Always go through Stripe Checkout (consistent flow like Free → Premium)
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId,
          planName: planId,
          billingCycle: interval,
        },
      });

      if (error) {
        // Handle specific error codes
        if (error.message?.includes('ALREADY_SUBSCRIBED') || error.message?.includes('already have')) {
          toast.error(t.subscription_already_subscribed);
          return;
        }
        throw error;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
        toast.success('Redirecting to checkout...');
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error('Error processing subscription change:', error);
      const errorMessage = error.message || t.subscription_errors_generic || 'An error occurred';
      
      // Check if it's an "already subscribed" error
      if (errorMessage.includes('ALREADY_SUBSCRIBED') || errorMessage.includes('already have')) {
        toast.error(t.subscription_already_subscribed);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsProcessing(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.subscription_title}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <SubscriptionPlansGrid
            currentPlan={currentPlan}
            currentInterval={currentInterval}
            onSelectPlan={handleSelectPlan}
            isLoading={isProcessing}
            canChangePlan={true}
            interval={interval}
            onIntervalChange={setInterval}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
