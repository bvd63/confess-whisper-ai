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
  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
    <div
      style={{
        width: '36px',
        height: '36px',
        borderRadius: '12px',
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
        fontSize: '15px',
        color: 'rgba(255,255,255,0.85)',
        fontWeight: 500,
        lineHeight: 1.3,
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
        className="max-w-md max-h-[min(90vh,720px)] overflow-hidden rounded-3xl p-0 shadow-2xl"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, #12142B 0%, #0D0E1C 45%, #08090F 100%)',
          border: '1px solid rgba(255,255,255,0.05)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
        }}
      >
        {/* ── Global noise texture ── */}
        <div
          className="absolute inset-0 pointer-events-none rounded-3xl"
          style={{
            backgroundImage: NOISE_SVG,
            opacity: 0.025,
            mixBlendMode: 'overlay' as const,
            zIndex: 0,
          }}
        />

        {/* ── HEADER ── */}
        <DialogHeader className="relative px-6 pt-6 pb-1" style={{ zIndex: 10, background: 'transparent' }}>
          <DialogTitle
            className="text-center"
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.95)',
              letterSpacing: '-0.3px',
            }}
          >
            Manage Subscription
          </DialogTitle>
        </DialogHeader>

        {/* ── SCROLLABLE CONTENT ── */}
        <div className="relative px-5 pb-6" style={{ zIndex: 10, paddingTop: '12px' }}>
          {loading ? (
            <div className="flex items-center justify-center" style={{ padding: '72px 0' }}>
              <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'rgba(168,85,247,0.5)' }} />
            </div>
          ) : (
            <>
              {/* ════════════════════════════════════════════ */}
              {/*  CURRENT PLAN CARD                           */}
              {/*  Glass card with subtle gradient left edge    */}
              {/* ════════════════════════════════════════════ */}
              <div style={{ position: 'relative', marginBottom: '20px' }}>
                <div
                  style={{
                    position: 'relative',
                    background: CONFIRM_GRADIENT,
                    border: '1px solid rgba(167,139,250,0.25)',
                    boxShadow:
                      '0 8px 28px rgba(167,139,250,0.35),' +
                      '0 2px 8px rgba(0,0,0,0.25),' +
                      'inset 0 1px 0 rgba(255,255,255,0.22)',
                    borderRadius: '20px',
                    padding: '20px 22px',
                    overflow: 'hidden',
                  }}
                >
                  {/* No overlay – matches Upgrade button exactly */}
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
                  <p
                    style={{
                      position: 'relative',
                      fontSize: '13px',
                      color: 'rgba(255,255,255,0.45)',
                      marginTop: '5px',
                      lineHeight: 1.4,
                    }}
                  >
                    {t.manage_sub_current_plan_desc}
                  </p>
                </div>
              </div>

              {/* ════════════════════════════════════════════ */}
              {/*  VIP PLAN CARD                               */}
              {/*  Dark center + neon purple edge glow          */}
              {/*  Multi-layer: wide ambient + tight border     */}
              {/* ════════════════════════════════════════════ */}
              {currentPlan === 'free' && (
                <div style={{ position: 'relative', marginBottom: '24px' }}>

                  {/* ── Soft diffused outer glow (wide, faint spread) ── */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      inset: '-16px',
                      borderRadius: '38px',
                      /* Uses CONFIRM_GRADIENT color family for glow, not random purple */
                      background:
                        'radial-gradient(ellipse at 15% 75%, rgba(192,132,252,0.18) 0%, transparent 55%),' +
                        'radial-gradient(ellipse at 50% 105%, rgba(167,139,250,0.14) 0%, transparent 50%),' +
                        'radial-gradient(ellipse at 85% 15%, rgba(129,140,248,0.08) 0%, transparent 50%)',
                      filter: 'blur(24px)',
                      zIndex: 0,
                    }}
                  />

                  {/* ── The panel itself (dark center, soft iOS glow) ── */}
                  <div
                    className="relative"
                    style={{
                      position: 'relative',
                      borderRadius: '24px',
                      padding: '28px 26px 26px',
                      overflow: 'hidden',
                      zIndex: 3,
                      /* Deep dark base — near-black center */
                      background:
                        'linear-gradient(145deg, #110E20 0%, #0C0B18 35%, #0E0A1A 65%, #100D1F 100%)',
                      /* Soft 1px border from CONFIRM_GRADIENT family */
                      border: '1px solid rgba(167,139,250,0.25)',
                      /* iOS-style multi-layer shadow: inner highlight + soft outer + faint spread */
                      boxShadow:
                        'inset 0 1px 0 rgba(255,255,255,0.07),' +
                        'inset 0 0 30px rgba(0,0,0,0.40),' +
                        '0 4px 16px rgba(167,139,250,0.15),' +
                        '0 12px 40px rgba(167,139,250,0.10),' +
                        '0 20px 60px rgba(0,0,0,0.35)',
                    }}
                  >
                    {/* Inner vignette — darkens center further */}
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        inset: 0,
                        borderRadius: '24px',
                        background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.35) 100%)',
                        zIndex: 0,
                      }}
                    />

                    {/* Accent illumination from CONFIRM_GRADIENT family */}
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

                    {/* Top sheen / glass highlight */}
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
                          marginBottom: '14px',
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

                      {/* Pricing */}
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline' }}>
                          <span
                            style={{
                              fontSize: '32px',
                              fontWeight: 700,
                              color: '#FFFFFF',
                              letterSpacing: '-0.5px',
                              lineHeight: 1,
                            }}
                          >
                            &euro;6.99
                          </span>
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: 400,
                              color: 'rgba(255,255,255,0.45)',
                              marginLeft: '3px',
                            }}
                          >
                            /month
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: '13px',
                            color: 'rgba(255,255,255,0.32)',
                            marginTop: '6px',
                            letterSpacing: '0.1px',
                          }}
                        >
                          &euro;54.99/year
                        </p>
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
                            marginBottom: '14px',
                          }}
                        >
                          Benefits
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <BenefitRow
                            icon={<InfinityIcon style={{ width: '17px', height: '17px', strokeWidth: 2 }} />}
                            label="Unlimited daily confessions"
                          />
                          <BenefitRow
                            icon={<Crown style={{ width: '17px', height: '17px', strokeWidth: 2 }} />}
                            label="VIP crown badge"
                          />
                          <BenefitRow
                            icon={<Coins style={{ width: '17px', height: '17px', strokeWidth: 2 }} />}
                            label="250 coins bonus on signup"
                          />
                          <BenefitRow
                            icon={<Award style={{ width: '17px', height: '17px', strokeWidth: 2 }} />}
                            label="Exclusive VIP badges & flairs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════ */}
              {/*  UPGRADE BUTTON                              */}
              {/* ════════════════════════════════════════════ */}
              {currentPlan === 'free' ? (
                <Button
                  onClick={handleUpgrade}
                  disabled={isProcessing}
                  className="w-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    height: '54px',
                    borderRadius: '999px',
                    /* Exact CONFIRM_GRADIENT */
                    background: CONFIRM_GRADIENT,
                    color: '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: 600,
                    border: 'none',
                    letterSpacing: '-0.1px',
                    boxShadow:
                      '0 8px 28px rgba(167,139,250,0.35),' +
                      '0 2px 8px rgba(0,0,0,0.25),' +
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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
