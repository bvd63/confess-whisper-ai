import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";
import { Loader2, Crown } from "lucide-react";
import { Button } from '@/components/ui/button';
import { logError, logDebug } from "@/lib/logger";
import { STRIPE_PRICE } from '@/lib/stripe-config';

interface UnifiedShopDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubscriptionUpdated?: () => void;
  defaultTab?: 'subscriptions' | 'coins';
}

export const UnifiedShopDialog = ({ 
  open, 
  onOpenChange, 
  onSubscriptionUpdated,
  defaultTab = 'subscriptions' 
}: UnifiedShopDialogProps) => {
  const { t } = useLanguage();
  const { user } = useCurrentUser();
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [currentInterval, setCurrentInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadSubscriptionStatus = useCallback(async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier, stripe_subscription_id, subscription_cadence')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profile) {
        setCurrentPlan(profile.subscription_tier || 'free');
        const detectedInterval = (profile.subscription_cadence as 'monthly' | 'yearly') || 'monthly';
        setCurrentInterval(detectedInterval);
      }
    } catch (error) {
      logError('Error loading subscription', error as Error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (open && user) {
      loadSubscriptionStatus();

      const channel = supabase
        .channel('profile-subscription-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            logDebug('Real-time subscription update received', payload);
const newProfile = payload.new as { subscription_tier?: string; subscription_cadence?: string };
            if (newProfile.subscription_tier) {
              setCurrentPlan(newProfile.subscription_tier);
            }
            if (newProfile.subscription_cadence) {
              const newInterval = newProfile.subscription_cadence as 'monthly' | 'yearly';
              setCurrentInterval(newInterval);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, user, loadSubscriptionStatus]);

  const goToStripeCheckout = async (url: string) => {
    try {
      if (window.top && window.top !== window) {
        window.top.location.href = url;
        return;
      }
    } catch (error) {
      console.debug('Cannot access window.top:', error);
    }
    const win = window.open(url, '_blank');
    if (win) return;
    window.location.href = url;
  };

  const handleUpgrade = async () => {
    setIsProcessing(true);
    try {
      const priceId = STRIPE_PRICE.VIP_MONTHLY;
      
      const { data, error } = await supabase.functions.invoke('billing-buy', {
        body: { tier: 'vip', cycle: 'monthly' },
      });
      
      if (error) throw error;
      
      if (data?.url) {
        await goToStripeCheckout(data.url);
        toast.success('Redirecting to checkout...');
        onOpenChange(false);
      }
    } catch (error: unknown) {
      logError('Error processing upgrade', error as Error);
      const msg = (error as { message?: string })?.message || t.subscription_errors_generic || 'An error occurred';
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        data-testid="manage-subscription-modal"
        className="max-w-md max-h-[90vh] overflow-y-auto bg-background border-border rounded-2xl p-0"
      >
        <DialogHeader className="sticky top-0 z-10 bg-background border-b border-border/50 px-6 py-4">
          <DialogTitle className="text-lg font-semibold text-foreground text-center">
            Manage Subscription
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
                <p className="text-xs font-medium text-muted-foreground mb-1">Current plan – {currentPlan.toUpperCase()}</p>
                <p className="text-sm text-foreground/60">
                  {currentPlan === 'free' ? 'Basic text to your owner, with your confessions.' : 'Unlimited confessions and exclusive features.'}
                </p>
              </div>

              {currentPlan === 'free' && (
                <div className="rounded-xl bg-muted/30 border border-border/50 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-foreground">VIP Plan</span>
                    <Crown className="w-5 h-5 text-primary" strokeWidth={2} />
                  </div>

                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-foreground">€6.99<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                    <p className="text-sm text-muted-foreground">€54.99/year</p>
                  </div>

                  <div className="space-y-2 pt-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Benefits</p>
                    <p className="text-sm text-foreground/80 leading-relaxed">Unlimited daily confessions</p>
                    <p className="text-sm text-foreground/80 leading-relaxed">VIP crown badge</p>
                    <p className="text-sm text-foreground/80 leading-relaxed">250 coins bonus on signup</p>
                    <p className="text-sm text-foreground/80 leading-relaxed">Exclusive VIP badges & flairs</p>
                  </div>
                </div>
              )}

              {currentPlan === 'free' ? (
                <Button
                  onClick={handleUpgrade}
                  disabled={isProcessing}
                  className="w-full rounded-full h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white font-semibold"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upgrade to VIP'}
                </Button>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-4">
                  You're on the VIP plan. Cancel anytime from account settings.
                </p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
