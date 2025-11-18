import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useCheckoutStatus = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const status = searchParams.get('status');
    const sessionId = searchParams.get('session_id');
    const coinPurchase = searchParams.get('coin_purchase');

    // Handle subscription checkout success
    if (status === 'success' && sessionId) {
      // Refresh subscription status
      supabase.functions.invoke('check-subscription').then(() => {
        toast({
          title: "✅ VIP Activated",
          description: "Welcome to VIP! Your subscription is now active.",
        });
      });

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

    // Handle coin purchase success
    if (coinPurchase === 'success' && sessionId) {
      toast({
        title: "✅ Coins Added",
        description: "Your coins have been added to your balance!",
      });

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
