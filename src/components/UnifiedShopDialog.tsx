import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";
import { Loader2, Crown, Infinity as InfinityIcon, Coins, BadgeCheck } from "lucide-react";
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
  const { t, language } = useLanguage();
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

  const benefitLines = {
    en: [
      'Unlimited daily confessions',
      'VIP crown badge',
      '250 coins bonus on signup',
      'Exclusive VIP badges & flairs',
    ],
    es: [
      'Confesiones diarias sin límite',
      'Insignia corona VIP',
      '250 monedas de regalo',
      'Insignias y flairs VIP exclusivos',
    ],
    de: [
      'Unbegrenzte Beichten täglich',
      'VIP-Kronenbadge',
      '250 Münzen als Bonus',
      'Exklusive VIP-Badges & Flairs',
    ],
  } as const;

  const vipBenefits = benefitLines[language];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        data-testid="manage-subscription-modal"
        className="max-w-md w-[calc(100vw-1.5rem)] max-h-[min(86vh,640px)] overflow-hidden bg-gradient-to-b from-background to-background/95 border border-border/40 rounded-2xl p-0 shadow-2xl"
      >
        <DialogHeader className="bg-gradient-to-b from-background via-background to-background/80 border-b border-border/30 px-5 py-4 [@media(max-height:750px)]:px-4 [@media(max-height:750px)]:py-3">
          <DialogTitle className="text-lg font-semibold text-foreground text-center">
            {t.manage_subscription_title}
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 py-4 space-y-3.5 [@media(max-height:750px)]:px-3.5 [@media(max-height:750px)]:py-3 [@media(max-height:750px)]:space-y-2.5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Current Plan Card - Glass-like with subtle depth */}
              <div className="relative rounded-2xl bg-gradient-to-br from-muted/40 to-muted/20 border border-border/30 p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.03)] [@media(max-height:750px)]:p-3">
                <p className="text-[15px] font-semibold text-foreground/90">
                  {t.manage_sub_current_plan_free}
                </p>
                <p className="text-[12.5px] text-foreground/70 mt-0.5 leading-tight [@media(max-height:750px)]:text-[12px]">
                  {t.manage_sub_current_plan_desc}
                </p>
              </div>

              {/* Billing Cycle Selector - Premium segmented control */}
              {currentPlan === 'free' && (
                <div className="rounded-full bg-muted/30 border border-border/20 p-1 flex shadow-inner h-11 [@media(max-height:750px)]:h-10">
                  <button
                    onClick={() => setSelectedInterval('monthly')}
                    className={`flex-1 rounded-full text-[13px] font-semibold transition-all ${
                      selectedInterval === 'monthly'
                        ? 'bg-gradient-to-b from-primary/20 to-primary/10 text-primary shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t.subscription_monthly}
                  </button>
                  <button
                    onClick={() => setSelectedInterval('yearly')}
                    className={`flex-1 rounded-full text-[13px] font-semibold transition-all ${
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
                <div className="relative rounded-[24px] overflow-visible">
                  <div className="absolute -inset-2 rounded-[24px] bg-[linear-gradient(135deg,rgba(170,120,255,0.95),rgba(120,210,255,0.55),rgba(170,120,255,0.95))] blur-[12px] opacity-[0.85] pointer-events-none z-0"></div>
                  <div className="absolute inset-0 rounded-[24px] border border-[rgba(190,150,255,0.55)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] pointer-events-none z-[1]"></div>

                  <div className="relative z-[2] rounded-[24px] p-5 [@media(max-height:750px)]:p-4 bg-[linear-gradient(135deg,rgba(160,110,255,0.18)_0%,rgba(60,180,255,0.12)_45%,rgba(10,12,18,0.86)_100%)] shadow-[0_18px_60px_rgba(0,0,0,0.55),0_6px_18px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.05)]">
                    <div className="space-y-3.5 [@media(max-height:750px)]:space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold text-white">{t.manage_sub_vip_plan}</span>
                        <div className="flex items-center gap-1.5 text-[#d4b36a]">
                          <Crown className="w-5 h-5" strokeWidth={1.9} />
                          <span className="text-[12px] font-semibold tracking-wide">VIP</span>
                        </div>
                      </div>

                      <div className="space-y-0.5">
                      {selectedInterval === 'monthly' ? (
                        <div className="space-y-0.5">
                          <div>
                            <span className="text-[2rem] leading-none font-bold text-white">€6.99</span>
                            <span className="text-base font-normal text-foreground/70 ml-1">/ {t.subscription_per_month}</span>
                          </div>
                          <p className="text-[13px] text-foreground/60 leading-tight">€54.99 / {t.subscription_per_year}</p>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <div>
                            <span className="text-[2rem] leading-none font-bold text-white">€54.99</span>
                            <span className="text-base font-normal text-foreground/70 ml-1">/ {t.subscription_per_year}</span>
                          </div>
                          <p className="text-[13px] text-foreground/60 leading-tight">
                            €{(54.99 / 12).toFixed(2)} / {t.subscription_per_month}
                          </p>
                        </div>
                      )}
                      </div>

                      <div className="space-y-2 pt-0.5 [@media(max-height:750px)]:space-y-1.5">
                        <p className="text-xs font-semibold text-foreground/65">{t.manage_sub_benefits}</p>
                      
                        <div className="flex items-center gap-2.5 min-w-0">
                          <InfinityIcon className="w-4 h-4 text-primary/90 shrink-0" strokeWidth={1.9} />
                          <span className="text-[14px] text-foreground/88 leading-tight whitespace-nowrap">{vipBenefits[0]}</span>
                        </div>

                        <div className="flex items-center gap-2.5 min-w-0">
                          <Crown className="w-4 h-4 text-primary/90 shrink-0" strokeWidth={1.9} />
                          <span className="text-[14px] text-foreground/88 leading-tight whitespace-nowrap">{vipBenefits[1]}</span>
                        </div>

                        <div className="flex items-center gap-2.5 min-w-0">
                          <Coins className="w-4 h-4 text-primary/90 shrink-0" strokeWidth={1.9} />
                          <span className="text-[14px] text-foreground/88 leading-tight whitespace-nowrap">{vipBenefits[2]}</span>
                        </div>

                        <div className="flex items-center gap-2.5 min-w-0">
                          <BadgeCheck className="w-4 h-4 text-primary/90 shrink-0" strokeWidth={1.9} />
                          <span className="text-[14px] text-foreground/88 leading-tight whitespace-nowrap">{vipBenefits[3]}</span>
                        </div>
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
                  className="relative w-full rounded-full h-11 [@media(max-height:750px)]:h-[44px] bg-gradient-to-r from-primary via-primary to-primary/90 hover:from-primary/90 hover:via-primary hover:to-primary text-white font-semibold text-[15px] shadow-[0_4px_16px_rgba(168,85,247,0.3),0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(168,85,247,0.4),0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.15)]"
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
