import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";
import { Loader2, Infinity as InfinityIcon, Heart, MessageSquare } from "lucide-react";
import { Button } from '@/components/ui/button';
import { logError, logDebug } from "@/lib/logger";
import { STRIPE_PRICE } from '@/lib/stripe-config';

/* ── SVG Crown Icon (modern, minimal, gold) ── */
const CrownIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M3 18H21V20H3V18ZM3.5 14L2 7L7 10L12 4L17 10L22 7L20.5 14H3.5Z"
      fill="currentColor"
    />
  </svg>
);

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

  const isVip = currentPlan === 'vip';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        data-testid="manage-subscription-modal"
        className="max-w-[420px] overflow-hidden border-0 rounded-[24px] p-0 gap-0"
        style={{
          background: 'linear-gradient(180deg, hsl(235 45% 8%) 0%, hsl(235 40% 5%) 100%)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 80px rgba(139,92,246,0.08)',
        }}
      >
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="text-xl font-bold tracking-tight" style={{ color: '#f0f0f5' }}>
            {t.manage_subscription_title || 'Manage Subscription'}
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-5 space-y-3.5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'hsl(265 80% 70%)' }} />
            </div>
          ) : (
            <>
              {/* ─── Current Plan Card ─── */}
              <div
                className="relative overflow-hidden p-5"
                style={{
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(96,165,250,0.08) 60%, rgba(139,92,246,0.06) 100%)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(139,92,246,0.15)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)',
                }}
              >
                <p className="text-[15px] font-bold" style={{ color: '#e8e8f0' }}>
                  {isVip
                    ? (t.subs_manage_currentPlan || 'Current plan') + ' – VIP'
                    : t.manage_sub_current_plan_free}
                </p>
                <p className="text-[13px] mt-1 leading-relaxed" style={{ color: 'rgba(200,200,220,0.6)' }}>
                  {isVip
                    ? (t.subscription_cancel_anytime || 'You can manage or cancel anytime.')
                    : t.manage_sub_current_plan_desc}
                </p>
              </div>

              {/* ─── VIP Plan Card (only for free users) ─── */}
              {!isVip && (
                <div className="relative" style={{ borderRadius: '24px' }}>
                  {/* Neon glow layer */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      inset: '-6px',
                      borderRadius: '28px',
                      background: 'linear-gradient(135deg, rgba(168,85,247,0.7), rgba(96,165,250,0.4), rgba(168,85,247,0.7))',
                      filter: 'blur(16px)',
                      opacity: 0.55,
                      zIndex: 0,
                    }}
                  />

                  {/* Border stroke */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      borderRadius: '24px',
                      border: '1px solid rgba(168,85,247,0.4)',
                      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)',
                      zIndex: 1,
                    }}
                  />

                  {/* Card content */}
                  <div
                    className="relative p-5 space-y-4"
                    style={{
                      borderRadius: '24px',
                      background: 'linear-gradient(135deg, rgba(168,85,247,0.14) 0%, rgba(96,165,250,0.08) 40%, rgba(12,14,22,0.88) 100%)',
                      backdropFilter: 'blur(12px)',
                      boxShadow: '0 20px 50px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
                      zIndex: 2,
                    }}
                  >
                    {/* Title Row */}
                    <div className="flex items-center justify-between">
                      <span className="text-[16px] font-bold" style={{ color: '#f0f0f5' }}>
                        {t.manage_sub_vip_plan}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <CrownIcon className="w-5 h-5" style={{ color: '#f5c842' }} />
                        <span
                          className="text-[10px] font-extrabold uppercase tracking-widest"
                          style={{ color: 'rgba(245,200,66,0.85)' }}
                        >
                          VIP
                        </span>
                      </div>
                    </div>

                    {/* Pricing */}
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-[28px] font-extrabold leading-none" style={{ color: '#ffffff' }}>
                          {'€6.99'}
                        </span>
                        <span className="text-[14px] font-normal" style={{ color: 'rgba(200,200,220,0.5)' }}>
                          {'/'}
                          {t.subscription_monthly?.toLowerCase() || 'month'}
                        </span>
                      </div>
                      <p className="text-[13px] mt-0.5" style={{ color: 'rgba(200,200,220,0.4)' }}>
                        {t.manage_sub_yearly_price}
                      </p>
                    </div>

                    {/* Benefits */}
                    <div className="space-y-3 pt-1">
                      <p
                        className="text-[11px] font-bold uppercase tracking-widest"
                        style={{ color: 'rgba(200,200,220,0.45)' }}
                      >
                        {t.manage_sub_benefits}
                      </p>

                      {/* Benefit rows */}
                      <BenefitRow
                        icon={<InfinityIcon className="w-4 h-4" strokeWidth={2} />}
                        label={t.manage_sub_benefit_unlimited}
                      />
                      <BenefitRow
                        icon={<Heart className="w-4 h-4" strokeWidth={2} />}
                        label={t.manage_sub_benefit_reactions}
                      />
                      <BenefitRow
                        icon={<CrownIcon className="w-4 h-4" />}
                        label={t.manage_sub_benefit_badge}
                      />
                      <BenefitRow
                        icon={<MessageSquare className="w-4 h-4" strokeWidth={2} />}
                        label={t.manage_sub_benefit_comments}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ─── CTA Button ─── */}
              {!isVip ? (
                <Button
                  onClick={handleUpgrade}
                  disabled={isProcessing}
                  className="relative w-full h-[52px] rounded-full font-bold text-[15px] border-0 transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, hsl(265 85% 58%), hsl(280 80% 52%))',
                    color: '#ffffff',
                    boxShadow: '0 6px 24px rgba(168,85,247,0.35), 0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.12)',
                  }}
                >
                  {isProcessing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    t.manage_sub_upgrade_to_vip
                  )}
                </Button>
              ) : (
                <p className="text-center text-[12px] py-3" style={{ color: 'rgba(200,200,220,0.45)' }}>
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

/* ── Benefit Row Component ── */
function BenefitRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-center justify-center w-7 h-7 shrink-0"
        style={{
          borderRadius: '8px',
          background: 'rgba(168,85,247,0.12)',
          border: '1px solid rgba(168,85,247,0.2)',
          color: 'hsl(265 85% 72%)',
        }}
      >
        {icon}
      </div>
      <span className="text-[13px] leading-tight" style={{ color: 'rgba(230,230,240,0.85)' }}>
        {label}
      </span>
    </div>
  );
}
