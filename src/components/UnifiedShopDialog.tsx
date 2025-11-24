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
        className="w-[calc(100vw-2rem)] max-w-4xl max-h-[90vh] overflow-y-auto bg-background border-border/50 rounded-3xl p-0 mx-auto shadow-elevated"
      >
        {/* Header with proper spacing for mobile */}
        <DialogHeader className="sticky top-0 z-10 backdrop-blur-xl bg-background/95 border-b border-border/50 px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center shadow-ios">
                <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-bold text-foreground text-left">
                  Upgrade & Shop
                </DialogTitle>
                <p className="text-xs sm:text-sm text-muted-foreground text-left">Choose your plan or get coins</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs key={`${open}-${defaultTab}`} defaultValue={defaultTab} className="w-full">
          {/* Tabs with 50/50 split */}
          <TabsList className="w-full h-14 sm:h-16 bg-muted/20 border-b border-border/50 p-0 grid grid-cols-2 rounded-none">
            <TabsTrigger 
              value="subscriptions" 
              className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-foreground text-muted-foreground transition-all duration-300"
            >
              <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:gap-2">
                <span className="text-xl sm:text-2xl">👑</span>
                <span className="text-xs sm:text-sm font-bold">VIP</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="coins" 
              className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-foreground text-muted-foreground transition-all duration-300"
            >
              <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:gap-2">
                <span className="text-xl sm:text-2xl">🪙</span>
                <span className="text-xs sm:text-sm font-bold">Coins</span>
              </div>
            </TabsTrigger>
          </TabsList>

          {/* VIP Tab Content */}
          <TabsContent value="subscriptions" className="mt-0 p-4 sm:p-6 animate-fade-in">
            {loading ? (
              <div className="flex items-center justify-center py-16">
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
                <div className="flex items-center justify-center gap-2 mt-8 text-xs sm:text-sm text-muted-foreground">
                  <span>✨ Cancel anytime</span>
                  <span>•</span>
                  <span>⚡ Instant access</span>
                </div>
              </>
            )}
          </TabsContent>

          {/* Coins Tab Content */}
          <TabsContent value="coins" className="mt-0 p-4 sm:p-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              {packages?.map((pkg) => (
                <Card 
                  key={pkg.id} 
                  className={cn(
                    "relative overflow-hidden border-border/50 bg-card hover:border-primary/30 transition-all duration-300 hover:scale-[1.02] shadow-card hover:shadow-elevated rounded-3xl",
                    pkg.is_popular && "border-primary/50 ring-2 ring-primary/20"
                  )}
                >
                  {pkg.is_popular && (
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-2xl rounded-tr-2xl shadow-ios">
                      ⭐ Popular
                    </div>
                  )}
                  <CardContent className="p-5 sm:p-6">
                    <div className="text-center mb-5">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-yellow-500/10 to-amber-500/10 flex items-center justify-center mx-auto mb-4 shadow-ios">
                        <span className="text-4xl sm:text-5xl">🪙</span>
                      </div>
                      <h3 className="font-bold text-lg sm:text-xl text-foreground mb-2">{pkg.name}</h3>
                      <p className="text-sm sm:text-base text-muted-foreground font-semibold">
                        {pkg.coins.toLocaleString()} coins
                      </p>
                    </div>
                    
                    {pkg.discount_percentage > 0 && (
                      <div className="flex items-center justify-center mb-4">
                        <Badge className="bg-green-500/15 text-green-600 dark:text-green-400 border-0 font-bold px-3 py-1.5 rounded-full shadow-ios">
                          💰 +{pkg.discount_percentage}% BONUS
                        </Badge>
                      </div>
                    )}

                    <div className="text-center mb-5">
                      <p className="text-3xl sm:text-4xl font-bold text-foreground">${pkg.price_usd.toFixed(2)}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-2 font-medium">
                        ${(pkg.price_usd / pkg.coins).toFixed(3)} per coin
                      </p>
                    </div>

                    <Button 
                      onClick={() => handleCoinPurchase(pkg.id)}
                      disabled={coinLoading === pkg.id}
                      className="w-full h-12 sm:h-14 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-bold text-sm sm:text-base rounded-2xl shadow-elevated hover:shadow-ios transition-all"
                    >
                      {coinLoading === pkg.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                          Buy Now
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-6 text-xs sm:text-sm text-muted-foreground font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="text-base">🔒</span>
                <span>Secure</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <span className="text-base">⚡</span>
                <span>Instant</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <span className="text-base">💯</span>
                <span>Guaranteed</span>
              </span>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};