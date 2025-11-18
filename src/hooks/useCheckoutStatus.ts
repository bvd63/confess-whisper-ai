import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';

export const useCheckoutStatus = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

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
              title: "✅ VIP Activated",
              description: "Welcome to VIP! Your subscription is now active.",
            });
          } else {
            toast({
              title: "Subscription Processing",
              description: "Your subscription is being processed. It will be activated shortly.",
            });
          }
        } catch (error) {
          logError('Error verifying subscription', error as Error);
          // Fallback to regular check
          await supabase.functions.invoke('check-subscription');
          toast({
            title: "✅ VIP Activated",
            description: "Welcome to VIP! Your subscription is now active.",
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
        title: "Checkout Cancelled",
        description: "You can try again whenever you're ready.",
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
              title: "✅ Coins Added",
              description: `${data.coins} coins have been added to your balance!`,
            });
          } else {
            toast({
              title: "Payment Processing",
              description: "Your payment is being processed. Coins will be added shortly.",
            });
          }
        } catch (error) {
          logError('Error verifying coin payment', error as Error);
          toast({
            title: "Payment Received",
            description: "Your payment was received. Coins will be added shortly.",
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
        title: "Purchase Cancelled",
        description: "You can try again whenever you're ready.",
        variant: "default",
      });

      // Clean up URL params
      searchParams.delete('coin_purchase');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, navigate, toast]);
};
