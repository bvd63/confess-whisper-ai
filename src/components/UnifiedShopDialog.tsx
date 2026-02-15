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
      {/* VERIFICATION: This is the REAL Manage Subscription modal - UnifiedShopDialog.tsx */}
      <DialogContent 
        data-testid="manage-subscription-modal"
        className="max-w-md max-h-[min(86vh,640px)] overflow-hidden bg-gradient-to-b from-background to-background/95 border border-border/40 rounded-2xl p-0 shadow-2xl"
      >
        <DialogHeader className="sticky top-0 z-10 bg-gradient-to-b from-background via-background to-background/80 border-b border-border/30 px-5 py-3.5 shadow-sm">
          <DialogTitle className="text-base font-semibold text-foreground text-center">
            Manage Subscription
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 py-3.5 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Current Plan Card - Glass-like with subtle depth */}
              <div className="relative rounded-xl bg-gradient-to-br from-muted/40 to-muted/20 border border-border/30 p-3 shadow-[0_2px_8px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.03)]">
                <p className="text-[14px] font-semibold text-foreground/90">
                  {t.manage_sub_current_plan_free}
                </p>
                <p className="text-[12px] text-foreground/70 mt-0.5 leading-tight">
                  {t.manage_sub_current_plan_desc}
                </p>
              </div>

              {/* Billing Cycle Selector - Premium segmented control */}
              {currentPlan === 'free' && (
                <div className="rounded-full bg-muted/30 border border-border/20 p-0.5 flex shadow-inner">
                  <button
                    onClick={() => setSelectedInterval('monthly')}
                    className={`flex-1 py-2 rounded-full text-[12px] font-semibold transition-all ${
                      selectedInterval === 'monthly'
                        ? 'bg-gradient-to-b from-primary/20 to-primary/10 text-primary shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t.subscription_monthly}
                  </button>
                  <button
                    onClick={() => setSelectedInterval('yearly')}
                    className={`flex-1 py-2 rounded-full text-[12px] font-semibold transition-all ${
                      selectedInterval === 'yearly'
                        ? 'bg-gradient-to-b from-primary/20 to-primary/10 text-primary shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t.subscription_yearly}
                  </button>
                </div>
              )}

              {/* VIP Plan Card - 3-Layer Premium Frame System with INLINE STYLES */}
              {currentPlan === 'free' && (
                <div 
                  className="relative" 
                  style={{
                    borderRadius: '24px',
                    overflow: 'visible'
                  }}
                >
                  {/* GlowLayer - Outer blurred gradient (INLINE STYLE PROOF) */}
                  <div 
                    className="absolute pointer-events-none"
                    style={{
                      inset: '-10px',
                      borderRadius: '24px',
                      background: 'linear-gradient(135deg, rgba(170,120,255,0.95), rgba(120,210,255,0.55), rgba(170,120,255,0.95))',
                      filter: 'blur(14px)',
                      opacity: 0.9,
                      zIndex: 0
                    }}
                  />
                  
                  {/* StrokeLayer - 1px border with inner highlight (INLINE STYLE PROOF) */}
                  <div 
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      borderRadius: '24px',
                      border: '1px solid rgba(190,150,255,0.55)',
                      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
                      zIndex: 1
                    }}
                  />
                  
                  {/* PanelLayer - Dark glass content background (INLINE STYLE PROOF) */}
                  <div 
                    className="relative p-4 space-y-3"
                    style={{
                      borderRadius: '24px',
                      background: 'linear-gradient(135deg, rgba(160,110,255,0.18) 0%, rgba(60,180,255,0.12) 45%, rgba(10,12,18,0.86) 100%)',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 18px 60px rgba(0,0,0,0.55), 0 6px 18px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)',
                      zIndex: 2
                    }}
                  >
                    {/* Title Row with Crown + VIP Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-base font-semibold text-white">{t.manage_sub_vip_plan}</span>
                      <div className="flex items-center gap-1.5">
                        <Crown className="w-5 h-5 text-amber-400" strokeWidth={2} />
                        <span className="text-[10px] font-bold text-amber-400/90 uppercase tracking-wide">VIP</span>
                      </div>
                    </div>

                    {/* Pricing */}
                    <div>
                      {selectedInterval === 'monthly' ? (
                        <div>
                          <span className="text-2xl font-bold text-white">€6.99</span>
                          <span className="text-sm font-normal text-muted-foreground/70 ml-1">/month</span>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <div>
                            <span className="text-2xl font-bold text-white">€54.99</span>
                            <span className="text-sm font-normal text-muted-foreground/70 ml-1">/year</span>
                          </div>
                          <p className="text-xs text-muted-foreground/60">
                            €{(54.99 / 12).toFixed(2)} / month
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Benefits with Icons */}
                    <div className="space-y-2 pt-1">
                      <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Benefits</p>
                      
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 border border-primary/20">
                          <InfinityIcon className="w-3.5 h-3.5 text-primary" strokeWidth={2} />
                        </div>
                        <span className="text-[13px] text-foreground/90 leading-tight">unlimited confessions</span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 border border-primary/20">
                          <Heart className="w-3.5 h-3.5 text-primary" strokeWidth={2} />
                        </div>
                        <span className="text-[13px] text-foreground/90 leading-tight">exclusive reactions</span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 border border-primary/20">
                          <Crown className="w-3.5 h-3.5 text-primary" strokeWidth={2} />
                        </div>
                        <span className="text-[13px] text-foreground/90 leading-tight">VIP crown badge</span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 border border-primary/20">
                          <MessageSquare className="w-3.5 h-3.5 text-primary" strokeWidth={2} />
                        </div>
                        <span className="text-[13px] text-foreground/90 leading-tight">priority comments</span>
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
                  className="relative w-full rounded-full h-11 bg-gradient-to-r from-primary via-primary to-primary/90 hover:from-primary/90 hover:via-primary hover:to-primary text-white font-semibold text-sm shadow-[0_4px_16px_rgba(168,85,247,0.3),0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(168,85,247,0.4),0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.15)]"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : t.manage_sub_upgrade_to_vip}
                </Button>
              ) : (
                <p className="text-center text-xs text-muted-foreground/70 py-3">
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
