import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";
import { Loader2, Infinity as InfinityIcon, Crown, Coins, Award } from "lucide-react";
import { Button } from '@/components/ui/button';
import { logError, logDebug } from "@/lib/logger";
import { STRIPE_PRICE } from '@/lib/stripe-config';

/* ------------------------------------------------------------------ */
/*  Reusable gradient token – matches Login button (primary → accent)  */
/* ------------------------------------------------------------------ */
const CONFIRM_GRADIENT = 'linear-gradient(to right, hsl(265 88% 72%), hsl(217 92% 68%))';

/* ------------------------------------------------------------------ */
/*  Inline SVG noise pattern used as card texture overlay              */
/* ------------------------------------------------------------------ */
const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

/* ------------------------------------------------------------------ */
/*  Gold crown SVG – clean line icon with gradient + glow              */
/* ------------------------------------------------------------------ */
const GoldCrownIcon = ({ size = 22 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ filter: "drop-shadow(0 0 5px rgba(251,191,36,0.35))" }}
  >
    <defs>
      <linearGradient id="crownGoldMain" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FDE68A" />
        <stop offset="100%" stopColor="#F5C842" />
      </linearGradient>
    </defs>
    <path
      d="M4 17H20V19H4V17ZM4.5 15.5L3 8L7.5 10.5L12 5L16.5 10.5L21 8L19.5 15.5H4.5Z"
      stroke="url(#crownGoldMain)"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Small crown for benefit rows – uses currentColor                   */
/* ------------------------------------------------------------------ */
const SmallCrownIcon = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M3 18H21V20H3V18ZM3.5 16L2 7L7 10L12 4L17 10L22 7L20.5 16H3.5Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Reusable benefit row                                               */
/* ------------------------------------------------------------------ */
const BenefitRow = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    <div
      style={{
        width: '32px',
        height: '32px',
        borderRadius: '10px',
        background: CONFIRM_GRADIENT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.12)',
        flexShrink: 0,
        color: 'rgba(255,255,255,0.92)',
      }}
    >
      {icon}
    </div>
    <span
      style={{
        fontSize: '14px',
        color: 'rgba(255,255,255,0.85)',
        fontWeight: 500,
        lineHeight: 1.2,
      }}
    >
      {label}
    </span>
  </div>
);

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */

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

  /* ── data loading (unchanged) ─────────────────────────────────── */

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

  /* ── render ───────────────────────────────────────────────────── */

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* VERIFICATION: This is the REAL Manage Subscription modal - UnifiedShopDialog.tsx */}
      <DialogContent
        data-testid="manage-subscription-modal"
        className="fixed inset-0 max-w-none w-screen translate-x-0 translate-y-0 left-0 top-0 rounded-none p-0 shadow-none border-0 [&>button[data-radix-collection-item]]:hidden [&>.absolute.right-2.top-2]:hidden data-[state=open]:animate-sheet-up data-[state=closed]:animate-sheet-down data-[state=open]:!slide-in-from-top-0 data-[state=open]:!zoom-in-100 data-[state=closed]:!slide-out-to-top-0 data-[state=closed]:!zoom-out-100"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, #12142B 0%, #0D0E1C 45%, #08090F 100%)',
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          opacity: 1,
        }}
      >
        {/* ── Global noise texture ── */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: NOISE_SVG,
            opacity: 0.025,
            mixBlendMode: 'overlay' as const,
            zIndex: 0,
          }}
        />

        {/* ── HEADER (App Store sheet style – 2 rows) ── */}
        <div
          className="relative shrink-0"
          style={{
            zIndex: 10,
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + clamp(10px, 1.5vh, 16px))',
          }}
        >
          {/* Row 1: X button alone, top-right */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: '12px' }}>
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              style={{
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.55)',
                fontSize: '18px',
                fontWeight: 300,
                lineHeight: 1,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
            >
              ✕
            </button>
          </div>

          {/* Row 2: Title centered, below X */}
          <DialogHeader
            style={{
              paddingTop: 'clamp(4px, 1vh, 14px)',
              paddingBottom: 'clamp(10px, 1.5vh, 16px)',
              paddingLeft: '24px',
              paddingRight: '24px',
            }}
          >
            <DialogTitle
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.95)',
                letterSpacing: '-0.3px',
                textAlign: 'center',
              }}
            >
              Manage Subscription
            </DialogTitle>
          </DialogHeader>

          {/* iOS-style separator / divider */}
          <div
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.10) 30%, rgba(255,255,255,0.10) 70%, transparent 95%)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          />
        </div>

        {/* ── CONTENT (no scroll, single centered stack) ── */}
        <div
          className="relative flex-1 overflow-hidden"
          style={{
            zIndex: 10,
            paddingLeft: '20px',
            paddingRight: '20px',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + var(--ms-cta-pb))',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center" style={{ padding: '72px 0' }}>
              <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'rgba(168,85,247,0.5)' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(22px, 3.2vh, 34px)' }}>
              {/* ── TOP: FREE card (shrink) ── */}
              {/*  CURRENT PLAN CARD                           */}
              {/* ════════════════════════════════════════════ */}
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'relative',
                    background: CONFIRM_GRADIENT,
                    border: 'none',
                    boxShadow:
                      '0 8px 28px rgba(167,139,250,0.35),' +
                      '0 2px 8px rgba(0,0,0,0.25),' +
                      'inset 0 1px 0 rgba(255,255,255,0.22)',
                    borderRadius: '20px',
                    height: 'var(--ms-cta-height)',
                    padding: '0 22px',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <p
                    style={{
                      position: 'relative',
                      fontSize: '16px',
                      fontWeight: 700,
                      color: currentPlan === 'vip' ? 'transparent' : 'rgba(255,255,255,0.92)',
                      ...(currentPlan === 'vip'
                        ? {
                            background: 'linear-gradient(135deg, #A855F7, #7C3AED)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                          }
                        : {}),
                      margin: 0,
                      lineHeight: 1.35,
                    }}
                  >
                    {t.manage_sub_current_plan_free}
                  </p>
                </div>
              </div>

              {currentPlan === 'free' && (
                <div style={{ position: 'relative' }}>

                  {/* ── Soft diffused outer glow ── */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      inset: '-16px',
                      borderRadius: '38px',
                      background:
                        'radial-gradient(ellipse at 15% 75%, rgba(192,132,252,0.18) 0%, transparent 55%),' +
                        'radial-gradient(ellipse at 50% 105%, rgba(167,139,250,0.14) 0%, transparent 50%),' +
                        'radial-gradient(ellipse at 85% 15%, rgba(129,140,248,0.08) 0%, transparent 50%)',
                      filter: 'blur(24px)',
                      zIndex: 0,
                    }}
                  />

                  {/* ── The panel itself ── */}
                  <div
                    className="relative"
                    style={{
                      position: 'relative',
                      borderRadius: '24px',
                      padding: 'var(--ms-vip-pad) 22px var(--ms-vip-pad)',
                      overflow: 'hidden',
                      zIndex: 3,
                      background:
                        'linear-gradient(145deg, #110E20 0%, #0C0B18 35%, #0E0A1A 65%, #100D1F 100%)',
                      border: '1px solid rgba(167,139,250,0.25)',
                      boxShadow:
                        'inset 0 1px 0 rgba(255,255,255,0.07),' +
                        'inset 0 0 30px rgba(0,0,0,0.40),' +
                        '0 4px 16px rgba(167,139,250,0.15),' +
                        '0 12px 40px rgba(167,139,250,0.10),' +
                        '0 20px 60px rgba(0,0,0,0.35)',
                    }}
                  >
                    {/* Inner vignette */}
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        inset: 0,
                        borderRadius: '24px',
                        background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.35) 100%)',
                        zIndex: 0,
                      }}
                    />

                    {/* Accent illumination */}
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        inset: 0,
                        borderRadius: '24px',
                        background:
                          'radial-gradient(ellipse at 0% 80%, rgba(192,132,252,0.12) 0%, transparent 50%),' +
                          'radial-gradient(ellipse at 20% 100%, rgba(167,139,250,0.08) 0%, transparent 45%),' +
                          'radial-gradient(ellipse at 85% 10%, rgba(129,140,248,0.06) 0%, transparent 50%)',
                        zIndex: 0,
                      }}
                    />

                    {/* Card noise texture */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundImage: NOISE_SVG,
                        opacity: 0.03,
                        mixBlendMode: 'overlay' as const,
                        borderRadius: '24px',
                        zIndex: 0,
                      }}
                    />

                    {/* Top sheen */}
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        top: 0,
                        left: '10%',
                        right: '10%',
                        height: '1px',
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)',
                        zIndex: 1,
                      }}
                    />

                    {/* ── CARD CONTENT ── */}
                    <div style={{ position: 'relative', zIndex: 2 }}>

                      {/* Title row */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 'var(--ms-title-mb)',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '17px',
                            fontWeight: 700,
                            color: 'rgba(255,255,255,0.95)',
                            letterSpacing: '-0.2px',
                          }}
                        >
                          {t.manage_sub_vip_plan}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <GoldCrownIcon size={22} />
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              letterSpacing: '1.2px',
                              background: 'linear-gradient(135deg, #FDE68A, #FBBF24)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                            }}
                          >
                            VIP
                          </span>
                        </div>
                      </div>

                      {/* Monthly / Yearly toggle */}
                      <div
                        style={{
                          display: 'flex',
                          borderRadius: '12px',
                          background: 'rgba(255,255,255,0.06)',
                          padding: '3px',
                          marginBottom: 'var(--ms-toggle-mb)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          position: 'relative',
                        }}
                      >
                        {(['monthly', 'yearly'] as const).map((interval) => {
                          const isActive = selectedInterval === interval;
                          return (
                            <button
                              key={interval}
                              onClick={() => setSelectedInterval(interval)}
                              style={{
                                flex: 1,
                                padding: '7px 0',
                                borderRadius: '10px',
                                fontSize: '13px',
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                background: isActive ? CONFIRM_GRADIENT : 'transparent',
                                color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
                                boxShadow: isActive
                                  ? '0 2px 8px rgba(167,139,250,0.3)'
                                  : 'none',
                                position: 'relative',
                              }}
                            >
                              {interval === 'monthly'
                                ? (t.manage_sub_monthly || 'Monthly')
                                : (t.manage_sub_yearly || 'Yearly')}
                            </button>
                          );
                        })}
                        {/* Save badge */}
                        <span
                          className="animate-pulse"
                          style={{
                            position: 'absolute',
                            top: '-9px',
                            right: '6px',
                            fontSize: '10px',
                            fontWeight: 800,
                            color: '#fff',
                            background: 'linear-gradient(135deg, #F59E0B, #FFB703)',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            letterSpacing: '0.3px',
                            lineHeight: '16px',
                            boxShadow: '0 2px 8px rgba(245,158,11,0.4), 0 1px 2px rgba(0,0,0,0.3)',
                            zIndex: 5,
                            whiteSpace: 'nowrap',
                            animationDuration: '2.5s',
                          }}
                        >
                          {t.manage_sub_save_percent || '34% off'} 🔥
                        </span>
                      </div>

                      {/* Pricing */}
                      <div style={{ marginBottom: 'var(--ms-price-mb)' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline' }}>
                          <span
                            style={{
                              fontSize: '30px',
                              fontWeight: 800,
                              color: '#FFFFFF',
                              letterSpacing: '-0.5px',
                              lineHeight: 1,
                              textShadow: '0 0 40px rgba(192,132,252,0.25), 0 0 80px rgba(167,139,250,0.12)',
                            }}
                          >
                            {selectedInterval === 'yearly' ? '€54.99' : '€6.99'}
                          </span>
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: 400,
                              color: 'rgba(255,255,255,0.45)',
                              marginLeft: '3px',
                            }}
                          >
                            {selectedInterval === 'yearly'
                              ? `/${t.manage_sub_year || 'year'}`
                              : `/${t.manage_sub_month || 'month'}`}
                          </span>
                        </div>
                        {selectedInterval === 'yearly' && (
                          <p
                            style={{
                              fontSize: '13px',
                              color: 'rgba(255,255,255,0.32)',
                              marginTop: '4px',
                              letterSpacing: '0.1px',
                            }}
                          >
                            €4.58/{t.manage_sub_month || 'month'}
                          </p>
                        )}
                        {selectedInterval === 'monthly' && (
                          <p
                            style={{
                              fontSize: '13px',
                              color: 'rgba(255,255,255,0.32)',
                              marginTop: '4px',
                              letterSpacing: '0.1px',
                            }}
                          >
                            €54.99/{t.manage_sub_year || 'year'}
                          </p>
                        )}
                      </div>

                      {/* Benefits */}
                      <div>
                        <p
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'rgba(255,255,255,0.40)',
                            textTransform: 'uppercase' as const,
                            letterSpacing: '1.1px',
                            marginBottom: 'var(--ms-benefits-label-mb)',
                          }}
                        >
                          Benefits
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ms-benefits-gap)' }}>
                          <BenefitRow
                            icon={<InfinityIcon style={{ width: '15px', height: '15px', strokeWidth: 2 }} />}
                            label="Unlimited daily confessions"
                          />
                          <BenefitRow
                            icon={<Crown style={{ width: '15px', height: '15px', strokeWidth: 2 }} />}
                            label="VIP crown badge"
                          />
                          <BenefitRow
                            icon={<Coins style={{ width: '15px', height: '15px', strokeWidth: 2 }} />}
                            label="250 coins bonus on signup"
                          />
                          <BenefitRow
                            icon={<Award style={{ width: '15px', height: '15px', strokeWidth: 2 }} />}
                            label="Exclusive VIP badges & flairs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── CTA ── */}
              {currentPlan === 'free' ? (
                <Button
                  onClick={handleUpgrade}
                  disabled={isProcessing}
                  className="w-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    height: 'var(--ms-cta-height)',
                    borderRadius: '999px',
                    background: CONFIRM_GRADIENT,
                    color: '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: 600,
                    border: 'none',
                    letterSpacing: '-0.1px',
                    paddingLeft: '32px',
                    paddingRight: '32px',
                    flexShrink: 0,
                    boxShadow:
                      '0 8px 28px rgba(167,139,250,0.40),' +
                      '0 2px 8px rgba(0,0,0,0.25),' +
                      '0 16px 48px rgba(167,139,250,0.15),' +
                      'inset 0 1px 0 rgba(255,255,255,0.22)',
                    cursor: isProcessing ? 'wait' : 'pointer',
                  }}
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : t.manage_sub_upgrade_to_vip}
                </Button>
              ) : (
                <p
                  style={{
                    textAlign: 'center',
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.30)',
                    padding: '12px 0',
                  }}
                >
                  {t.subscription_cancel_anytime}
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
