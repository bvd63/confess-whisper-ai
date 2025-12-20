import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { SubscriptionPlansGrid } from "./SubscriptionPlansGrid";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";
import { Loader2, Crown, Coins, Sparkles, TrendingUp, Zap, X } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { logWarn, logError, logDebug } from "@/lib/logger";

interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  price_usd: number;
  discount_percentage: number;
  is_popular: boolean;
  display_order: number;
}

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
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [coinLoading, setCoinLoading] = useState<string | null>(null);

  // Coin packages query
  const { data: packages } = useQuery({
    queryKey: ['coin-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coin_packages')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data as CoinPackage[];
    }
  });

  useEffect(() => {
    if (open && user) {
      loadSubscriptionStatus();

      // Set up real-time subscription to profiles table
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
            const newProfile = payload.new as any;
            if (newProfile.subscription_tier) {
              setCurrentPlan(newProfile.subscription_tier);
            }
            if (newProfile.subscription_cadence) {
              const newInterval = newProfile.subscription_cadence as 'monthly' | 'yearly';
              setCurrentInterval(newInterval);
              setInterval(newInterval);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, user]);

  const loadSubscriptionStatus = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier, stripe_subscription_id, subscription_cadence')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profile) {
        setCurrentPlan(profile.subscription_tier || 'free');
        // Use subscription_cadence from database, fallback to monthly if not set
        const detectedInterval = (profile.subscription_cadence as 'monthly' | 'yearly') || 'monthly';
        setCurrentInterval(detectedInterval);
        setInterval(detectedInterval);
      }
    } catch (error) {
      logError('Error loading subscription', error as Error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleSelectPlan = async (planId: string, priceId: string) => {
    if (!priceId) return;
    if (planId === currentPlan && interval === currentInterval) return;

    setIsProcessing(true);
    try {
      if (planId === 'vip') {
        try {
          const { data, error } = await supabase.functions.invoke('customer-portal');
          if (!error && data?.url) {
            toast.success('Opening billing portal…');
            await goToStripeCheckout(data.url);
            return;
          }
        } catch (e) {
          logWarn('customer-portal VIP pre-check failed, will fallback', { error: e });
        }
      }

      const levels = { free: 0, vip: 1 } as const;
      const cur = levels[(currentPlan as keyof typeof levels) || 'free'] ?? 0;
      const tgt = levels[(planId as keyof typeof levels) || 'free'] ?? 0;

      if (cur === 0) {
        const { data, error } = await supabase.functions.invoke('billing-buy', {
          body: { tier: planId, cycle: interval },
        });
        if (error) throw error;
        if (data?.url) {
          await goToStripeCheckout(data.url);
          toast.success('Redirecting to checkout...');
          onOpenChange(false);
        }
        return;
      }

      if (tgt > cur || (tgt === cur && interval !== currentInterval)) {
        try {
          const { data, error } = await supabase.functions.invoke('customer-portal');
          if (!error && data?.url) {
            toast.success('Opening billing portal…');
            await goToStripeCheckout(data.url);
            return;
          }
        } catch (e) {
          logWarn('customer-portal failed, fallback to checkout', { error: e });
        }

        const { data: upData, error: upErr } = await supabase.functions.invoke('billing-upgrade', {
          body: { newPriceId: priceId },
        });
        if (upErr) throw upErr;
        if (upData?.url) {
          toast.success(t.webhookLag || 'Upgrade initiated. Redirecting…');
          await goToStripeCheckout(upData.url);
          onOpenChange(false);
          onSubscriptionUpdated?.();
        }
        return;
      }

      if (tgt < cur) {
        const { error } = await supabase.functions.invoke('subscription-downgrade', {
          body: { targetPriceId: priceId },
        });
        if (error) throw error;
        toast.success(t.downgrade_scheduled_next_period || 'Downgrade scheduled');
        onOpenChange(false);
        return;
      }
    } catch (error: unknown) {
      logError('Error processing subscription change', error as Error);
      const msg = (error as { message?: string })?.message || t.subscription_errors_generic || t.upgradeFailed || 'An error occurred';
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCoinPurchase = async (packageId: string) => {
    setCoinLoading(packageId);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(t.auth_login || 'Please sign in to purchase coins');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-coin-checkout', {
        body: { packageId }
      });

      if (error) throw error;

      if (data?.url) {
        toast.info('Opening secure Stripe Checkout...');
        const win = window.open(data.url, '_blank', 'noopener,noreferrer');
        
        if (!win || win.closed || typeof win.closed === 'undefined') {
          window.location.href = data.url;
        }
      }
    } catch (error) {
      logError('Purchase error', error as Error);
      toast.error(t.coins_purchase_error || 'Failed to create checkout session');
    } finally {
      setCoinLoading(null);
    }
  };

  const getPackageIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'starter': return <Coins className="w-8 h-8" />;
      case 'popular': return <TrendingUp className="w-8 h-8" />;
      case 'value': return <Sparkles className="w-8 h-8" />;
      case 'vip': return <Zap className="w-8 h-8" />;
      default: return <Coins className="w-8 h-8" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        data-testid="manage-subscription-modal"
        className="max-w-5xl max-h-[90vh] overflow-y-auto bg-background border-border rounded-3xl p-0"
      >
        <DialogHeader className="sticky top-0 z-10 glass-strong border-b border-border px-6 py-5">
          <div className="flex items-center gap-3 relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary-pressed flex items-center justify-center shadow-lg shadow-primary/25">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold text-foreground">
                Subscription & Coins
              </DialogTitle>
              <p className="text-sm text-foreground-secondary mt-0.5">
                Manage your subscription and purchase coins
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="absolute right-0 top-0 h-9 w-9 rounded-xl hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="px-6 py-6">
          <Tabs key={`${open}-${defaultTab}`} defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 h-14 rounded-2xl bg-muted p-1.5 gap-1.5">
              <TabsTrigger value="subscriptions" className="flex items-center gap-2 text-sm rounded-xl h-full data-[state=active]:bg-card data-[state=active]:shadow-lg font-semibold">
                <Crown className="w-5 h-5" />
                <span>Subscriptions</span>
              </TabsTrigger>
              <TabsTrigger value="coins" className="flex items-center gap-2 text-sm rounded-xl h-full data-[state=active]:bg-card data-[state=active]:shadow-lg font-semibold">
                <Coins className="w-5 h-5" />
                <span>Coins</span>
              </TabsTrigger>
            </TabsList>

          <TabsContent value="subscriptions">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <SubscriptionPlansGrid
                  currentPlan={currentPlan}
                  currentInterval={currentInterval}
                  onSelectPlan={handleSelectPlan}
                  isLoading={isProcessing}
                  canChangePlan={true}
                  interval={interval}
                  onIntervalChange={setInterval}
                />
                <p className="text-center text-sm text-foreground-muted mt-8 px-4">
                  You can cancel anytime from account settings. No long-term commitments.
                </p>
              </>
            )}
          </TabsContent>

          <TabsContent value="coins">
            <div className="space-y-8">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-vip to-warning flex items-center justify-center shadow-lg">
                    <Coins className="w-5 h-5 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  {t.coins_shop_title || 'Coin Shop'}
                </h3>
                <p className="text-base text-muted-foreground mt-2">
                  {t.coins_shop_subtitle || 'Get coins to unlock exclusive features!'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {packages?.map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`relative p-6 rounded-2xl border-2 transition-all hover:scale-[1.02] hover:shadow-lg ${
                      pkg.is_popular
                        ? 'border-yellow-500 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 shadow-md'
                        : 'border-border bg-card'
                    }`}
                  >
                    {pkg.is_popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-5 py-1.5 rounded-full text-xs font-bold shadow-lg">
                        ⭐ {t.coins_best_value || 'BEST VALUE'}
                      </div>
                    )}

                    {pkg.discount_percentage > 0 && (
                      <div className="absolute -top-3 -right-3 bg-red-500 text-white w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
                        -{pkg.discount_percentage}%
                      </div>
                    )}

                    <div className="flex flex-col items-center text-center space-y-5">
                      <div className="text-yellow-500 p-3 bg-yellow-500/10 rounded-2xl">
                        {getPackageIcon(pkg.name)}
                      </div>

                      <div>
                        <h3 className="font-bold text-lg mb-2">{pkg.name}</h3>
                        <p className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">
                          {pkg.coins.toLocaleString()} 🪙
                        </p>
                      </div>

                      <div className="text-3xl font-bold">
                        ${pkg.price_usd.toFixed(2)}
                      </div>

                      <div className="text-xs text-muted-foreground font-medium">
                        ${(pkg.price_usd / pkg.coins).toFixed(4)} {t.coins_per_coin || 'per coin'}
                      </div>

                      <Button
                        onClick={() => handleCoinPurchase(pkg.id)}
                        disabled={coinLoading === pkg.id}
                        className={`w-full h-12 rounded-xl font-semibold ${
                          pkg.is_popular
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white'
                            : ''
                        }`}
                      >
                        {coinLoading === pkg.id ? (
                          <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            {t.coins_processing || 'Processing...'}
                          </span>
                        ) : (
                          t.coins_buy_now || 'Buy Now'
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-5 bg-muted/50 rounded-2xl">
                <p className="text-sm text-center text-muted-foreground leading-relaxed">
                  💳 {t.coins_secure_payment || 'Secure payment via Stripe'} • 
                  🔒 {t.coins_instant_delivery || 'Instant delivery'} •
                  💯 {t.coins_satisfaction || 'Guaranteed'}
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};