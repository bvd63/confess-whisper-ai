import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';
import { useLanguage } from '@/contexts/LanguageContext';

export const useCheckoutStatus = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    const status = searchParams.get('status');
    const sessionId = searchParams.get('session_id');
    const coinPurchase = searchParams.get('coin_purchase');

    // Handle subscription checkout success - verify immediately
    if (status === 'success' && sessionId) {
      // Verify subscription and update profile immediately
      const verifySubscription = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('verify-subscription-payment', {
            body: { sessionId }
          });

          if (error) throw error;

          if (data?.success) {
            // Also refresh subscription status
            await supabase.functions.invoke('check-subscription');
            
            toast({
              title: t.plans_vip_activated || "✅ VIP Activated",
              description: t.plans_vip_welcome || "Welcome to VIP! Your subscription is now active.",
            });
          } else {
            toast({
              title: t.subscription_processing || "Processing...",
              description: t.subscription_processing || "Your subscription is being processed. It will be activated shortly.",
            });
          }
        } catch (error) {
          logError('Error verifying subscription', error as Error);
          // Fallback to regular check
          await supabase.functions.invoke('check-subscription');
          toast({
            title: t.plans_vip_activated || "✅ VIP Activated",
            description: t.plans_vip_welcome || "Welcome to VIP! Your subscription is now active.",
          });
        }
      };

      verifySubscription();

      // Clean up URL params
      searchParams.delete('status');
      searchParams.delete('session_id');
      setSearchParams(searchParams, { replace: true });

      // Ensure we're on /home
      if (window.location.pathname !== '/home') {
        navigate('/home', { replace: true });
      }
    } else if (status === 'cancel') {
      toast({
        title: t.payment_canceled_title || "Checkout Cancelled",
        description: t.payment_canceled_desc || "You can try again whenever you're ready.",
        variant: "default",
      });

      // Clean up URL params
      searchParams.delete('status');
      setSearchParams(searchParams, { replace: true });
    }

    // Handle coin purchase success - verify payment immediately
    if (coinPurchase === 'success' && sessionId) {
      // Verify payment and award coins immediately
      const verifyCoinPayment = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('verify-coin-payment', {
            body: { sessionId }
          });

          if (error) throw error;

          if (data?.success) {
            toast({
              title: t.coins_purchase_success_title || "✅ Coins Added",
              description: t.coins_purchase_success_message || `${data.coins} coins have been added to your balance!`,
            });
          } else {
            toast({
              title: t.subscription_processing || "Payment Processing",
              description: t.subscription_processing || "Your payment is being processed. Coins will be added shortly.",
            });
          }
        } catch (error) {
          logError('Error verifying coin payment', error as Error);
          toast({
            title: t.subscription_processing || "Payment Received",
            description: t.subscription_processing || "Your payment was received. Coins will be added shortly.",
          });
        }
      };

      verifyCoinPayment();

      // Clean up URL params
      searchParams.delete('coin_purchase');
      searchParams.delete('session_id');
      setSearchParams(searchParams, { replace: true });

      // Ensure we're on /home
      if (window.location.pathname !== '/home') {
        navigate('/home', { replace: true });
      }
    } else if (coinPurchase === 'cancel') {
      toast({
        title: t.coins_purchase_cancelled_title || "Purchase Cancelled",
        description: t.coins_purchase_cancelled_message || "You can try again whenever you're ready.",
        variant: "default",
      });

      // Clean up URL params
      searchParams.delete('coin_purchase');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, navigate, toast, t]);
};
