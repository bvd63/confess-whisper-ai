import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Coins, Sparkles, TrendingUp, Crown, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  price_usd: number;
  discount_percentage: number;
  is_popular: boolean;
  display_order: number;
}

interface CoinShopProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CoinShop({ open, onOpenChange }: CoinShopProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState<string | null>(null);

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

  const handlePurchase = async (packageId: string) => {
    setLoading(packageId);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(t.auth_login || 'Please sign in to purchase coins');
        return;
      }

      // Call Stripe checkout Edge Function
      const { data, error } = await supabase.functions.invoke('create-coin-checkout', {
        body: { packageId }
      });

      if (error) throw error;

      // Redirect to Stripe Checkout (new tab to avoid iframe/X-Frame-Options issues)
      if (data?.url) {
        toast.info('Opening secure Stripe Checkout...');
        const win = window.open(data.url, '_blank', 'noopener,noreferrer');
        
        // If popup is blocked, use same-window navigation as fallback
        if (!win || win.closed || typeof win.closed === 'undefined') {
          window.location.href = data.url;
        }
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error(t.coins_purchase_error || 'Failed to create checkout session');
    } finally {
      setLoading(null);
    }
  };

  const getPackageIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'starter': return <Coins className="w-8 h-8" />;
      case 'popular': return <TrendingUp className="w-8 h-8" />;
      case 'value': return <Sparkles className="w-8 h-8" />;
      case 'premium': return <Zap className="w-8 h-8" />;
      default: return <Coins className="w-8 h-8" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              {t.coins_shop_title || '🪙 Coin Shop'}
            </span>
          </DialogTitle>
          <p className="text-center text-muted-foreground mt-2">
            {t.coins_shop_subtitle || 'Get coins to unlock premium features, boost confessions, and more!'}
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {packages?.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative p-6 rounded-xl border-2 transition-all hover:scale-105 ${
                pkg.is_popular
                  ? 'border-yellow-500 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20'
                  : 'border-border bg-card'
              }`}
            >
              {pkg.is_popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-1 rounded-full text-xs font-bold">
                  ⭐ {t.coins_best_value || 'BEST VALUE'}
                </div>
              )}

              {pkg.discount_percentage > 0 && (
                <div className="absolute -top-3 -right-3 bg-red-500 text-white w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
                  -{pkg.discount_percentage}%
                </div>
              )}

              <div className="flex flex-col items-center text-center space-y-4">
                <div className="text-yellow-500">
                  {getPackageIcon(pkg.name)}
                </div>

                <div>
                  <h3 className="font-bold text-lg">{pkg.name}</h3>
                  <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">
                    {pkg.coins.toLocaleString()} 🪙
                  </p>
                </div>

                <div className="text-2xl font-bold">
                  ${pkg.price_usd.toFixed(2)}
                </div>

                <div className="text-xs text-muted-foreground">
                  ${(pkg.price_usd / pkg.coins).toFixed(4)} {t.coins_per_coin || 'per coin'}
                </div>

                <Button
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={loading === pkg.id}
                  className={`w-full ${
                    pkg.is_popular
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600'
                      : ''
                  }`}
                >
                  {loading === pkg.id ? (
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

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm text-center text-muted-foreground">
            💳 {t.coins_secure_payment || 'Secure payment powered by Stripe'} • 
            🔒 {t.coins_instant_delivery || 'Instant coin delivery'} •
            💯 {t.coins_satisfaction || '100% satisfaction guaranteed'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
