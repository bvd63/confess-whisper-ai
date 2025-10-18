import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CoinsData {
  balance: number;
  lifetimeEarned: number;
  loading: boolean;
}

export const useCoins = (userId: string | undefined) => {
  const [coinsData, setCoinsData] = useState<CoinsData>({
    balance: 0,
    lifetimeEarned: 0,
    loading: true,
  });

  useEffect(() => {
    if (!userId) {
      setCoinsData({ balance: 0, lifetimeEarned: 0, loading: false });
      return;
    }

    const loadCoins = async () => {
      try {
        const { data, error } = await supabase
          .from('user_coins')
          .select('balance, lifetime_earned')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) throw error;

        setCoinsData({
          balance: data?.balance || 0,
          lifetimeEarned: data?.lifetime_earned || 0,
          loading: false,
        });
      } catch (error) {
        console.error('Error loading coins:', error);
        setCoinsData({ balance: 0, lifetimeEarned: 0, loading: false });
      }
    };

    // Load initial data
    loadCoins();

    // Set up realtime subscription
    const channel = supabase
      .channel(`user_coins:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_coins',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new && 'balance' in payload.new) {
            setCoinsData({
              balance: (payload.new as any).balance || 0,
              lifetimeEarned: (payload.new as any).lifetime_earned || 0,
              loading: false,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const refetch = async () => {
    if (!userId) return;
    
    setCoinsData(prev => ({ ...prev, loading: true }));
    try {
      const { data, error } = await supabase
        .from('user_coins')
        .select('balance, lifetime_earned')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      setCoinsData({
        balance: data?.balance || 0,
        lifetimeEarned: data?.lifetime_earned || 0,
        loading: false,
      });
    } catch (error) {
      console.error('Error refetching coins:', error);
      setCoinsData(prev => ({ ...prev, loading: false }));
    }
  };

  return {
    balance: coinsData.balance,
    lifetimeEarned: coinsData.lifetimeEarned,
    loading: coinsData.loading,
    refetch,
  };
};
