import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { SubscriptionPlansGrid } from "./SubscriptionPlansGrid";
import { ModernVIPCard } from "./ModernVIPCard";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";
import { Loader2, Crown, Coins, Sparkles, TrendingUp, Zap, ShoppingCart } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { logWarn, logError, logDebug } from "@/lib/logger";
import { cn } from "@/lib/utils";

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
        className="max-w-5xl max-h-[90vh] overflow-y-auto bg-background border-border p-4 sm:p-6 mx-4 sm:mx-auto"
      >
        <DialogHeader className="space-y-4 mt-4 text-center">
          <DialogTitle className="flex items-center justify-center gap-2 text-2xl sm:text-3xl font-bold text-foreground">
            <Crown className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            👑 Subscription & Coins
          </DialogTitle>
        </DialogHeader>

        <Tabs key={`${open}-${defaultTab}`} defaultValue={defaultTab} className="w-full mt-6">
          <TabsList className="grid w-full grid-cols-2 mb-0 rounded-none border-b p-0 h-auto bg-card">
            <TabsTrigger 
              value="subscriptions" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-4 px-4 text-base font-semibold data-[state=active]:text-primary text-muted-foreground"
            >
              <Crown className="w-4 h-4 mr-2" />
              👑 Subscriptions
            </TabsTrigger>
            <TabsTrigger 
              value="coins" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-4 px-4 text-base font-semibold data-[state=active]:text-primary text-muted-foreground"
            >
              <Coins className="w-4 h-4 mr-2" />
              🪙 Coin Shop
            </TabsTrigger>
          </TabsList>

          <TabsContent value="subscriptions" className="mt-0 p-4 sm:p-6 bg-background">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
                <p className="text-center text-xs text-muted-foreground mt-6">
                  ℹ️ You can cancel anytime from account settings. No long-term commitments.
                </p>
              </>
            )}
          </TabsContent>

          <TabsContent value="coins" className="mt-0 p-4 sm:p-6 bg-background space-y-6">
            <div className="grid grid-cols-1 gap-4">
              {packages?.map((pkg) => (
                <Card 
                  key={pkg.id} 
                  className={cn(
                    "relative overflow-hidden border-border bg-card hover:border-primary/50 transition-all duration-300 hover:scale-[1.02]",
                    pkg.is_popular && "border-primary/50 shadow-xl ring-2 ring-primary/20"
                  )}
                >
                  {pkg.is_popular && (
                    <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground font-bold shadow-lg">
                      ⭐ Popular
                    </Badge>
                  )}
                  <CardContent className="p-6">
                    <div className="text-center mb-4">
                      <div className="text-5xl mb-3 animate-bounce-gentle">
                        {getPackageIcon(pkg.name)}
                      </div>
                      <h3 className="font-bold text-xl text-foreground">{pkg.name}</h3>
                      <p className="text-sm text-muted-foreground font-medium mt-1">
                        🪙 {pkg.coins.toLocaleString()} coins
                      </p>
                    </div>
                    
                    {pkg.discount_percentage > 0 && (
                      <div className="flex items-center justify-center gap-2 text-sm mb-4">
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 font-semibold">
                          💰 {pkg.discount_percentage}% BONUS
                        </Badge>
                      </div>
                    )}

                    <div className="text-center mb-4">
                      <p className="text-3xl font-bold text-foreground">${pkg.price_usd.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground mt-1">≈ ${(pkg.price_usd / pkg.coins).toFixed(3)} per coin</p>
                    </div>

                    <Button 
                      onClick={() => handleCoinPurchase(pkg.id)}
                      disabled={coinLoading === pkg.id}
                      className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base rounded-xl shadow-lg"
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      {coinLoading === pkg.id ? t.processing : "Buy Now"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center space-y-2 mt-6 px-4">
              <p className="text-sm text-muted-foreground">
                {t.coins_secure_payment || 'Secure payment via Stripe'} •
                {t.coins_instant_delivery || 'Instant coin delivery'} •
                {t.coins_satisfaction || '100% satisfaction guaranteed'}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};