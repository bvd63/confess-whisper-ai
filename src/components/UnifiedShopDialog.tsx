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
  const [selectedInterval, setSelectedInterval] = useState<'monthly' | 'yearly'>('monthly');
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
      const priceId = selectedInterval === 'yearly' ? STRIPE_PRICE.VIP_YEARLY : STRIPE_PRICE.VIP_MONTHLY;
      
      const { data, error } = await supabase.functions.invoke('billing-buy', {
        body: { tier: 'vip', cycle: selectedInterval },
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

        <div className="px-5 py-5 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Current Plan Card */}
              <div className="rounded-xl bg-card/80 backdrop-blur-sm border border-border/40 p-4">
                <p className="text-[15px] font-semibold text-foreground">
                  {t.manage_sub_current_plan_free}
                </p>
                <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">
                  {t.manage_sub_current_plan_desc}
                </p>
              </div>

              {/* Billing Cycle Selector — iOS segmented control */}
              {currentPlan === 'free' && (
                <div className="rounded-xl bg-card/80 backdrop-blur-sm border border-border/40 p-1 flex">
                  <button
                    onClick={() => setSelectedInterval('monthly')}
                    className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-all ${
                      selectedInterval === 'monthly'
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t.subscription_monthly}
                  </button>
                  <button
                    onClick={() => setSelectedInterval('yearly')}
                    className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-all ${
                      selectedInterval === 'yearly'
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t.subscription_yearly}
                  </button>
                </div>
              )}

              {/* VIP Plan Card */}
              {currentPlan === 'free' && (
                <div className="rounded-xl bg-card/80 backdrop-blur-sm border border-border/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-semibold text-foreground">{t.manage_sub_vip_plan}</span>
                    <Crown className="w-5 h-5 text-primary" strokeWidth={2} />
                  </div>

                  <div>
                    {selectedInterval === 'monthly' ? (
                      <p className="text-2xl font-bold text-foreground">
                        €6.99<span className="text-[13px] font-normal text-muted-foreground ml-1">/ {t.subscription_per_month}</span>
                      </p>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-foreground">
                          €54.99<span className="text-[13px] font-normal text-muted-foreground ml-1">/ {t.subscription_per_year}</span>
                        </p>
                        <p className="text-[12px] text-muted-foreground mt-0.5">
                          €{(54.99 / 12).toFixed(2)} / {t.subscription_per_month}
                        </p>
                      </>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[13px] text-muted-foreground leading-snug">Unlimited daily confessions</p>
                    <p className="text-[13px] text-muted-foreground leading-snug">VIP crown badge</p>
                    <p className="text-[13px] text-muted-foreground leading-snug">250 coins bonus on signup</p>
                    <p className="text-[13px] text-muted-foreground leading-snug">Exclusive VIP badges & flairs</p>
                  </div>
                </div>
              )}

              {/* CTA Button */}
              {currentPlan === 'free' ? (
                <Button
                  onClick={handleUpgrade}
                  disabled={isProcessing}
                  className="w-full rounded-full h-11 bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 text-primary-foreground font-semibold text-[15px] transition-opacity"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : t.manage_sub_upgrade_to_vip}
                </Button>
              ) : (
                <p className="text-center text-[13px] text-muted-foreground py-4">
                  {t.subscription_cancel_anytime}
                </p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
