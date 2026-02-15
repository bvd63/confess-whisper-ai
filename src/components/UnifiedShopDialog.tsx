import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";
import { Loader2, Crown, Infinity as InfinityIcon, Heart, MessageSquare } from "lucide-react";
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
        className="max-w-md max-h-[90vh] overflow-y-auto bg-gradient-to-b from-background to-background/95 border border-border/40 rounded-2xl p-0 shadow-2xl"
      >
        <DialogHeader className="sticky top-0 z-10 bg-gradient-to-b from-background via-background to-background/80 border-b border-border/30 px-6 py-5 shadow-sm">
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
              {/* Current Plan Card - Glass-like with subtle depth */}
              <div className="relative rounded-2xl bg-gradient-to-br from-muted/40 to-muted/20 border border-border/30 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.03)]">
                <p className="text-[15px] font-semibold text-foreground/90">
                  {t.manage_sub_current_plan_free}
                </p>
                <p className="text-[13px] text-foreground/70 mt-0.5 leading-snug">
                  {t.manage_sub_current_plan_desc}
                </p>
              </div>

              {/* Billing Cycle Selector - Premium segmented control */}
              {currentPlan === 'free' && (
                <div className="rounded-full bg-muted/30 border border-border/20 p-1 flex shadow-inner">
                  <button
                    onClick={() => setSelectedInterval('monthly')}
                    className={`flex-1 py-2.5 rounded-full text-[13px] font-semibold transition-all ${
                      selectedInterval === 'monthly'
                        ? 'bg-gradient-to-b from-primary/20 to-primary/10 text-primary shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t.subscription_monthly}
                  </button>
                  <button
                    onClick={() => setSelectedInterval('yearly')}
                    className={`flex-1 py-2.5 rounded-full text-[13px] font-semibold transition-all ${
                      selectedInterval === 'yearly'
                        ? 'bg-gradient-to-b from-primary/20 to-primary/10 text-primary shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t.subscription_yearly}
                  </button>
                </div>
              )}

              {/* VIP Plan Card - Premium atmospheric depth */}
              {currentPlan === 'free' && (
                <div className="relative rounded-2xl overflow-hidden p-6 space-y-5">
                  {/* Layered background with purple ambient glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-slate-950/95"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-primary/5 opacity-60"></div>
                  
                  {/* Edge lighting - subtle inner glow */}
                  <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-primary/10"></div>
                  
                  {/* Layered shadows for depth */}
                  <div className="absolute inset-0 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(168,85,247,0.08)]"></div>
                  
                  {/* Content layer */}
                  <div className="relative z-10 space-y-5">
                    {/* Title Row with VIP Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold text-white">{t.manage_sub_vip_plan}</span>
                      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 shadow-[0_0_16px_rgba(168,85,247,0.15)]">
                        <Crown className="w-6 h-6 text-primary" strokeWidth={2} />
                      </div>
                    </div>

                    {/* Pricing */}
                    <div>
                      {selectedInterval === 'monthly' ? (
                        <div>
                          <span className="text-3xl font-bold text-white">€6.99</span>
                          <span className="text-base font-normal text-muted-foreground/80 ml-1">/ {t.subscription_per_month}</span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div>
                            <span className="text-3xl font-bold text-white">€54.99</span>
                            <span className="text-base font-normal text-muted-foreground/80 ml-1">/ {t.subscription_per_year}</span>
                          </div>
                          <p className="text-sm text-muted-foreground/70">
                            €{(54.99 / 12).toFixed(2)} / {t.subscription_per_month}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Benefits with Icons */}
                    <div className="space-y-3 pt-2">
                      <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider mb-3">Benefits</p>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20">
                          <InfinityIcon className="w-4 h-4 text-primary" strokeWidth={2} />
                        </div>
                        <span className="text-sm text-foreground/90 leading-relaxed">unlimited confessions</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20">
                          <Heart className="w-4 h-4 text-primary" strokeWidth={2} />
                        </div>
                        <span className="text-sm text-foreground/90 leading-relaxed">exclusive reactions</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20">
                          <Crown className="w-4 h-4 text-primary" strokeWidth={2} />
                        </div>
                        <span className="text-sm text-foreground/90 leading-relaxed">VIP crown badge</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20">
                          <MessageSquare className="w-4 h-4 text-primary" strokeWidth={2} />
                        </div>
                        <span className="text-sm text-foreground/90 leading-relaxed">priority comments</span>
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
                  className="relative w-full rounded-full h-12 bg-gradient-to-r from-primary via-primary to-primary/90 hover:from-primary/90 hover:via-primary hover:to-primary text-white font-semibold text-[15px] shadow-[0_4px_16px_rgba(168,85,247,0.3),0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(168,85,247,0.4),0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.15)]"
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
