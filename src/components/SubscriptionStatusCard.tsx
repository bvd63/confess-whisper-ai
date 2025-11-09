import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/state/SubscriptionProvider";
import { useLanguage } from "@/contexts/LanguageContext";
import { Crown, Zap, Calendar, Settings } from "lucide-react";
import { STRIPE_CONFIG } from "@/lib/stripe-config";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const SubscriptionStatusCard = () => {
  const { subscriptionTier, subscriptionEnd, isLoading } = useSubscription();
  const { t } = useLanguage();

  const openStripeCheckout = () => {
    try {
      if (window.top && window.top !== window) {
        window.top.location.href = STRIPE_CONFIG.CHECKOUT_URL;
      } else {
        const win = window.open(STRIPE_CONFIG.CHECKOUT_URL, '_blank', 'noopener');
        if (!win) window.location.href = STRIPE_CONFIG.CHECKOUT_URL;
      }
    } catch {
      window.location.href = STRIPE_CONFIG.CHECKOUT_URL;
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.error) {
        toast.error("No active subscription found. Redirecting to checkout...");
        openStripeCheckout();
        return;
      }
      
      if (data?.url) {
        try {
          if (window.top && window.top !== window) {
            window.top.location.href = data.url;
          } else {
            const win = window.open(data.url, '_blank', 'noopener');
            if (!win) window.location.href = data.url;
          }
        } catch {
          window.location.href = data.url;
        }
      }
    } catch (error) {
      console.error('Error opening portal:', error);
      toast.error("Opening checkout instead...");
      openStripeCheckout();
    }
  };

  const getTierInfo = () => {
    switch (subscriptionTier) {
      case 'vip':
        return {
          icon: Crown,
          name: 'VIP',
          color: 'text-yellow-500',
          bgGradient: 'from-yellow-500/20 to-yellow-600/10',
          description: 'Unlimited everything + Priority support'
        };
      default:
        return {
          icon: Zap,
          name: 'Free',
          color: 'text-gray-500',
          bgGradient: 'from-gray-500/20 to-gray-600/10',
          description: 'Basic features with limitations'
        };
    }
  };

  const tierInfo = getTierInfo();
  const Icon = tierInfo.icon;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <>
      <Card className={`p-6 bg-gradient-to-br ${tierInfo.bgGradient} border-[#1a1b2e]`}>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl bg-black/30 ${tierInfo.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  {tierInfo.name}
                  {subscriptionTier !== 'free' && (
                    <Badge variant="outline" className="text-xs">Active</Badge>
                  )}
                </h3>
                <p className="text-sm text-gray-400">{tierInfo.description}</p>
              </div>
            </div>
          </div>

          {/* Subscription details */}
          {subscriptionTier !== 'free' && subscriptionEnd && (
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>Renews on {formatDate(subscriptionEnd)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>Synced with Stripe</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {subscriptionTier === 'free' ? (
              <Button 
                onClick={openStripeCheckout}
                className="flex-1 gap-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400"
              >
                <Crown className="w-4 h-4" />
                Upgrade to VIP
              </Button>
            ) : (
              <Button 
                onClick={handleManageSubscription}
                variant="outline"
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                Manage
              </Button>
            )}
          </div>
        </div>
      </Card>
    </>
  );
};
