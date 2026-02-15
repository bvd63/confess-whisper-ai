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

/* ------------------------------------------------------------------ */
/*  SVG Crown Icon with gold gradient                                  */
/* ------------------------------------------------------------------ */
const GoldCrownIcon = ({ size = 22, className = "" }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ filter: "drop-shadow(0 0 10px rgba(251,191,36,0.5))" }}
  >
    <defs>
      <linearGradient id="crownGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FDE68A" />
        <stop offset="100%" stopColor="#FBBF24" />
      </linearGradient>
    </defs>
    <path
      d="M3 18H21V20H3V18ZM3.5 16L2 7L7 10L12 4L17 10L22 7L20.5 16H3.5Z"
      stroke="url(#crownGold)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Small Crown SVG for benefit row                                    */
/* ------------------------------------------------------------------ */
const SmallCrownIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
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
        className="max-w-md max-h-[min(90vh,720px)] overflow-hidden border-0 rounded-3xl p-0 shadow-2xl"
        style={{
          background: 'radial-gradient(ellipse at top center, #12142B 0%, #0F1020 40%, #0A0B16 100%)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Noise overlay for realism */}
        <div
          className="absolute inset-0 pointer-events-none z-0 rounded-3xl"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            opacity: 0.025,
            mixBlendMode: 'overlay',
          }}
        />

        {/* ─── HEADER ─── */}
        <DialogHeader
          className="relative z-10 px-6 pt-6 pb-2"
          style={{
            background: 'transparent',
            borderBottom: 'none',
          }}
        >
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

        {/* ─── CONTENT ─── */}
        <div className="relative z-10 px-6 pb-6 space-y-6" style={{ paddingTop: '8px' }}>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'rgba(168,85,247,0.6)' }} />
            </div>
          ) : (
            <>
              {/* ═══════════════════════════════════════════ */}
              {/*  CURRENT PLAN CARD – Glassmorphism          */}
              {/* ═══════════════════════════════════════════ */}
              <div
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 10px 40px rgba(0,0,0,0.45)',
                  borderRadius: '24px',
                  padding: '24px',
                }}
              >
                <p
                  style={{
                    fontSize: '17px',
                    fontWeight: 600,
                    color: currentPlan === 'vip' ? 'transparent' : 'rgba(255,255,255,0.92)',
                    ...(currentPlan === 'vip'
                      ? {
                          background: 'linear-gradient(135deg, #A855F7, #7C3AED)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }
                      : {}),
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  {t.manage_sub_current_plan_free}
                </p>
                <p
                  style={{
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.50)',
                    marginTop: '6px',
                    lineHeight: 1.45,
                  }}
                >
                  {t.manage_sub_current_plan_desc}
                </p>
              </div>

              {/* ═══════════════════════════════════════════ */}
              {/*  BILLING CYCLE SELECTOR                     */}
              {/* ═══════════════════════════════════════════ */}
              {currentPlan === 'free' && (
                <div
                  style={{
                    display: 'flex',
                    borderRadius: '999px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    padding: '3px',
                    boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.3)',
                  }}
                >
                  <button
                    onClick={() => setSelectedInterval('monthly')}
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      borderRadius: '999px',
                      fontSize: '13px',
                      fontWeight: 600,
                      transition: 'all 0.25s ease',
                      border: 'none',
                      cursor: 'pointer',
                      background: selectedInterval === 'monthly'
                        ? 'linear-gradient(135deg, rgba(124,58,237,0.35), rgba(168,85,247,0.2))'
                        : 'transparent',
                      color: selectedInterval === 'monthly'
                        ? 'rgba(168,85,247,1)'
                        : 'rgba(255,255,255,0.4)',
                      boxShadow: selectedInterval === 'monthly'
                        ? '0 2px 8px rgba(168,85,247,0.2), inset 0 1px 0 rgba(255,255,255,0.08)'
                        : 'none',
                    }}
                  >
                    {t.subscription_monthly}
                  </button>
                  <button
                    onClick={() => setSelectedInterval('yearly')}
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      borderRadius: '999px',
                      fontSize: '13px',
                      fontWeight: 600,
                      transition: 'all 0.25s ease',
                      border: 'none',
                      cursor: 'pointer',
                      background: selectedInterval === 'yearly'
                        ? 'linear-gradient(135deg, rgba(124,58,237,0.35), rgba(168,85,247,0.2))'
                        : 'transparent',
                      color: selectedInterval === 'yearly'
                        ? 'rgba(168,85,247,1)'
                        : 'rgba(255,255,255,0.4)',
                      boxShadow: selectedInterval === 'yearly'
                        ? '0 2px 8px rgba(168,85,247,0.2), inset 0 1px 0 rgba(255,255,255,0.08)'
                        : 'none',
                    }}
                  >
                    {t.subscription_yearly}
                  </button>
                </div>
              )}

              {/* ═══════════════════════════════════════════ */}
              {/*  VIP PLAN CARD – PREMIUM LAYERED             */}
              {/* ═══════════════════════════════════════════ */}
              {currentPlan === 'free' && (
                <div className="relative" style={{ borderRadius: '28px', overflow: 'visible' }}>
                  {/* Outer glow */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      inset: '-4px',
                      borderRadius: '32px',
                      boxShadow: '0 0 60px rgba(168,85,247,0.35)',
                      zIndex: 0,
                    }}
                  />

                  {/* Border layer */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      borderRadius: '28px',
                      border: '1px solid rgba(168,85,247,0.35)',
                      zIndex: 1,
                    }}
                  />

                  {/* Main panel */}
                  <div
                    className="relative"
                    style={{
                      borderRadius: '28px',
                      padding: '28px',
                      background: 'linear-gradient(135deg, #1A1F3A 0%, #12162C 50%, #1B1240 100%)',
                      boxShadow: 'inset 0 0 40px rgba(0,0,0,0.4), 0 20px 60px rgba(0,0,0,0.5)',
                      zIndex: 2,
                      overflow: 'hidden',
                    }}
                  >
                    {/* Subtle purple glow overlay bottom-right */}
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        inset: 0,
                        borderRadius: '28px',
                        background: 'radial-gradient(circle at 80% 80%, rgba(138,43,226,0.25), transparent 60%)',
                        zIndex: 0,
                      }}
                    />

                    {/* Content */}
                    <div className="relative" style={{ zIndex: 1 }}>
                      {/* ─── Title Row with Crown + VIP Badge ─── */}
                      <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
                        <span
                          style={{
                            fontSize: '18px',
                            fontWeight: 700,
                            color: 'rgba(255,255,255,0.95)',
                            letterSpacing: '-0.2px',
                          }}
                        >
                          {t.manage_sub_vip_plan}
                        </span>
                        <div className="flex items-center gap-2">
                          <GoldCrownIcon size={24} />
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              letterSpacing: '1.5px',
                              textTransform: 'uppercase' as const,
                              background: 'linear-gradient(135deg, #FDE68A, #FBBF24)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                            }}
                          >
                            VIP
                          </span>
                        </div>
                      </div>

                      {/* ─── Pricing ─── */}
                      <div style={{ marginBottom: '20px' }}>
                        {selectedInterval === 'monthly' ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'baseline' }}>
                              <span
                                style={{
                                  fontSize: '34px',
                                  fontWeight: 800,
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
                                  marginLeft: '4px',
                                }}
                              >
                                /month
                              </span>
                            </div>
                            <p
                              style={{
                                fontSize: '14px',
                                color: 'rgba(255,255,255,0.35)',
                                marginTop: '6px',
                              }}
                            >
                              &euro;54.99/year
                            </p>
                          </div>
                        ) : (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'baseline' }}>
                              <span
                                style={{
                                  fontSize: '34px',
                                  fontWeight: 800,
                                  color: '#FFFFFF',
                                  letterSpacing: '-0.5px',
                                  lineHeight: 1,
                                }}
                              >
                                &euro;54.99
                              </span>
                              <span
                                style={{
                                  fontSize: '14px',
                                  fontWeight: 400,
                                  color: 'rgba(255,255,255,0.45)',
                                  marginLeft: '4px',
                                }}
                              >
                                /year
                              </span>
                            </div>
                            <p
                              style={{
                                fontSize: '14px',
                                color: 'rgba(255,255,255,0.35)',
                                marginTop: '6px',
                              }}
                            >
                              &euro;{(54.99 / 12).toFixed(2)} / month
                            </p>
                          </div>
                        )}
                      </div>

                      {/* ─── Benefits ─── */}
                      <div>
                        <p
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'rgba(255,255,255,0.45)',
                            textTransform: 'uppercase' as const,
                            letterSpacing: '1.2px',
                            marginBottom: '14px',
                          }}
                        >
                          Benefits
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                          {/* Benefit: Unlimited confessions */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '12px',
                                background: 'rgba(168,85,247,0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: 'inset 0 0 12px rgba(168,85,247,0.1)',
                                flexShrink: 0,
                              }}
                            >
                              <InfinityIcon
                                style={{ width: '18px', height: '18px', color: 'rgba(168,85,247,0.9)', strokeWidth: 2 }}
                              />
                            </div>
                            <span
                              style={{
                                fontSize: '15px',
                                color: 'rgba(255,255,255,0.85)',
                                fontWeight: 500,
                              }}
                            >
                              unlimited confessions
                            </span>
                          </div>

                          {/* Benefit: Exclusive reactions */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '12px',
                                background: 'rgba(168,85,247,0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: 'inset 0 0 12px rgba(168,85,247,0.1)',
                                flexShrink: 0,
                              }}
                            >
                              <Heart
                                style={{ width: '18px', height: '18px', color: 'rgba(168,85,247,0.9)', strokeWidth: 2 }}
                              />
                            </div>
                            <span
                              style={{
                                fontSize: '15px',
                                color: 'rgba(255,255,255,0.85)',
                                fontWeight: 500,
                              }}
                            >
                              exclusive reactions
                            </span>
                          </div>

                          {/* Benefit: VIP crown badge */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '12px',
                                background: 'rgba(168,85,247,0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: 'inset 0 0 12px rgba(168,85,247,0.1)',
                                flexShrink: 0,
                                color: 'rgba(168,85,247,0.9)',
                              }}
                            >
                              <SmallCrownIcon size={18} />
                            </div>
                            <span
                              style={{
                                fontSize: '15px',
                                color: 'rgba(255,255,255,0.85)',
                                fontWeight: 500,
                              }}
                            >
                              VIP crown badge
                            </span>
                          </div>

                          {/* Benefit: Priority comments */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '12px',
                                background: 'rgba(168,85,247,0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: 'inset 0 0 12px rgba(168,85,247,0.1)',
                                flexShrink: 0,
                              }}
                            >
                              <MessageSquare
                                style={{ width: '18px', height: '18px', color: 'rgba(168,85,247,0.9)', strokeWidth: 2 }}
                              />
                            </div>
                            <span
                              style={{
                                fontSize: '15px',
                                color: 'rgba(255,255,255,0.85)',
                                fontWeight: 500,
                              }}
                            >
                              priority comments
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════ */}
              {/*  CTA BUTTON – Premium Pill                   */}
              {/* ═══════════════════════════════════════════ */}
              {currentPlan === 'free' ? (
                <div style={{ paddingTop: '4px' }}>
                  <Button
                    onClick={handleUpgrade}
                    disabled={isProcessing}
                    className="w-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      height: '56px',
                      borderRadius: '999px',
                      background: 'linear-gradient(90deg, #7C3AED, #A855F7, #9333EA)',
                      color: '#FFFFFF',
                      fontSize: '16px',
                      fontWeight: 600,
                      border: 'none',
                      boxShadow: '0 10px 40px rgba(168,85,247,0.45), inset 0 1px 0 rgba(255,255,255,0.25)',
                      cursor: isProcessing ? 'wait' : 'pointer',
                      letterSpacing: '-0.2px',
                    }}
                  >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : t.manage_sub_upgrade_to_vip}
                  </Button>
                </div>
              ) : (
                <p
                  style={{
                    textAlign: 'center',
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.35)',
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
