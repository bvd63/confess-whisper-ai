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
        className="max-w-md bg-gradient-to-b from-background to-background/95 border border-border/40 rounded-2xl p-0 shadow-2xl overflow-hidden"
      >
        <DialogHeader className="bg-gradient-to-b from-background via-background to-background/80 border-b border-border/30 px-5 py-3 shadow-sm">
          <DialogTitle className="text-base font-semibold text-foreground text-center">
            Manage Subscription
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 py-3 space-y-2.5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Current Plan Card - Glass-like with subtle depth */}
               <div className="rounded-xl bg-gradient-to-br from-muted/40 to-muted/20 border border-border/30 px-3.5 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
                <p className="text-sm font-semibold text-foreground/90">
                  {t.manage_sub_current_plan_free}
                </p>
                <p className="text-xs text-foreground/70 mt-0.5 leading-snug truncate">
                  {t.manage_sub_current_plan_desc}
                </p>
              </div>

              {/* Billing Cycle Selector - Premium segmented control */}
              {currentPlan === 'free' && (
                <div className="rounded-full bg-muted/30 border border-border/20 p-0.5 flex shadow-inner">
                  <button
                    onClick={() => setSelectedInterval('monthly')}
                    className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      selectedInterval === 'monthly'
                        ? 'bg-gradient-to-b from-primary/20 to-primary/10 text-primary shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t.subscription_monthly}
                  </button>
                  <button
                    onClick={() => setSelectedInterval('yearly')}
                    className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      selectedInterval === 'yearly'
                        ? 'bg-gradient-to-b from-primary/20 to-primary/10 text-primary shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t.subscription_yearly}
                  </button>
                </div>
              )}

              {/* VIP Plan Card - Neon edge glow + dark inner panel */}
              {currentPlan === 'free' && (
                <div className="relative rounded-xl p-0">
                  {/* A) Outer neon edge glow */}
                  <div
                    className="absolute pointer-events-none rounded-[inherit]"
                    style={{
                      inset: '-2px',
                      background: 'linear-gradient(135deg, rgba(168,120,255,0.95), rgba(120,200,255,0.55), rgba(168,120,255,0.95))',
                      filter: 'blur(6px)',
                      opacity: 0.75,
                      zIndex: 0,
                    }}
                  />
                  {/* Crisp edge line */}
                  <div
                    className="absolute pointer-events-none rounded-[inherit]"
                    style={{
                      inset: 0,
                      border: '1px solid rgba(180,140,255,0.45)',
                      opacity: 0.9,
                      zIndex: 1,
                    }}
                  />

                  {/* B) Dark inner panel */}
                  <div
                    className="relative rounded-[inherit] px-3.5 py-3"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)), rgba(10,12,20,0.78)',
                      zIndex: 2,
                    }}
                  >
                    <div className="space-y-2.5">
                      {/* Title + Crown */}
                      <div className="flex items-center justify-between">
                        <span className="text-base font-semibold text-white">{t.manage_sub_vip_plan}</span>
                        <Crown className="w-5 h-5 text-amber-400/85" strokeWidth={2} />
                      </div>

                      {/* Pricing */}
                      <div>
                        {selectedInterval === 'monthly' ? (
                          <div>
                            <span className="text-2xl font-bold text-white">€6.99</span>
                            <span className="text-sm font-normal text-muted-foreground/80 ml-1">/ {t.subscription_per_month}</span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-2xl font-bold text-white">€54.99</span>
                            <span className="text-sm font-normal text-muted-foreground/80 ml-1">/ {t.subscription_per_year}</span>
                            <p className="text-xs text-muted-foreground/70 mt-0.5">
                              €{(54.99 / 12).toFixed(2)} / {t.subscription_per_month}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Benefits - compact, NO emoji */}
                      <div className="space-y-0.5 pt-0.5">
                        <p className="text-[11px] text-muted-foreground/60 uppercase tracking-wider font-medium">Benefits</p>
                        <p className="text-[13px] text-foreground/80 leading-snug">• Unlimited daily confessions</p>
                        <p className="text-[13px] text-foreground/80 leading-snug">• VIP crown badge</p>
                        <p className="text-[13px] text-foreground/80 leading-snug">• 250 coins bonus on signup</p>
                        <p className="text-[13px] text-foreground/80 leading-snug">• Exclusive VIP badges & flairs</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CTA Button with depth */}
              {currentPlan === 'free' ? (
                <Button
                  onClick={handleUpgrade}
                  disabled={isProcessing}
                  className="relative w-full rounded-full h-10 bg-gradient-to-r from-primary via-primary to-primary/90 hover:from-primary/90 hover:via-primary hover:to-primary text-white font-semibold text-sm shadow-[0_4px_16px_rgba(168,85,247,0.3)] transition-all duration-200"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : t.manage_sub_upgrade_to_vip}
                </Button>
              ) : (
                <p className="text-center text-sm text-muted-foreground/70 py-4">
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
