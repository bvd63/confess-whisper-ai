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
        className="max-w-[360px] bg-[#0d0d14] border border-white/[0.06] rounded-2xl p-0 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <DialogHeader className="border-b border-white/[0.06] px-5 py-3">
          <DialogTitle className="text-[15px] font-semibold text-white/90 text-center">
            Manage Subscription
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 py-3 space-y-2.5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Current Plan Card */}
              <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2.5">
                <p className="text-[13px] font-semibold text-white/90">
                  {t.manage_sub_current_plan_free}
                </p>
                <p className="text-[11px] text-white/40 mt-0.5 leading-snug truncate">
                  {t.manage_sub_current_plan_desc}
                </p>
              </div>

              {/* Billing Cycle Selector */}
              {currentPlan === 'free' && (
                <div className="rounded-full bg-white/[0.04] border border-white/[0.06] p-0.5 flex">
                  <button
                    onClick={() => setSelectedInterval('monthly')}
                    className={`flex-1 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                      selectedInterval === 'monthly'
                        ? 'bg-primary/15 text-primary'
                        : 'text-white/40 hover:text-white/60'
                    }`}
                  >
                    {t.subscription_monthly}
                  </button>
                  <button
                    onClick={() => setSelectedInterval('yearly')}
                    className={`flex-1 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                      selectedInterval === 'yearly'
                        ? 'bg-primary/15 text-primary'
                        : 'text-white/40 hover:text-white/60'
                    }`}
                  >
                    {t.subscription_yearly}
                  </button>
                </div>
              )}

              {/* VIP Plan Card */}
              {currentPlan === 'free' && (
                <div className="relative rounded-xl overflow-hidden px-4 py-3.5">
                  {/* Dark glass base */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#16141f] via-[#110f1a] to-[#0e0c15]"></div>
                  {/* Subtle ambient purple radial glow */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(168,85,247,0.08)_0%,transparent_60%)]"></div>
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(139,92,246,0.06)_0%,transparent_50%)]"></div>
                  {/* Edge border */}
                  <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-primary/[0.08]"></div>
                  
                  <div className="relative z-10 space-y-2.5">
                    {/* Title + Crown icon */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">{t.manage_sub_vip_plan}</span>
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/[0.15]">
                        <Crown className="w-4 h-4 text-primary/80" strokeWidth={2} />
                      </div>
                    </div>

                    {/* Pricing */}
                    <div>
                      {selectedInterval === 'monthly' ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold text-white">€6.99</span>
                          <span className="text-xs text-white/40">/ {t.subscription_per_month}</span>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-white">€54.99</span>
                            <span className="text-xs text-white/40">/ {t.subscription_per_year}</span>
                          </div>
                          <p className="text-[11px] text-white/30 mt-0.5">
                            €{(54.99 / 12).toFixed(2)} / {t.subscription_per_month}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Benefits */}
                    <div className="space-y-0.5 pt-0.5">
                      <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium mb-1">Benefits</p>
                      <p className="text-[12px] text-white/60 leading-relaxed">• Unlimited daily confessions</p>
                      <p className="text-[12px] text-white/60 leading-relaxed">• VIP crown badge</p>
                      <p className="text-[12px] text-white/60 leading-relaxed">• 250 coins bonus on signup</p>
                      <p className="text-[12px] text-white/60 leading-relaxed">• Exclusive VIP badges & flairs</p>
                    </div>
                  </div>
                </div>
              )}

              {/* CTA */}
              {currentPlan === 'free' ? (
                <Button
                  onClick={handleUpgrade}
                  disabled={isProcessing}
                  className="w-full rounded-full h-[42px] bg-gradient-to-r from-primary via-primary to-primary/85 hover:from-primary/90 hover:to-primary text-white font-semibold text-[13px] shadow-[0_4px_20px_rgba(168,85,247,0.25)] transition-all duration-200"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : t.manage_sub_upgrade_to_vip}
                </Button>
              ) : (
                <p className="text-center text-xs text-white/30 py-3">
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
