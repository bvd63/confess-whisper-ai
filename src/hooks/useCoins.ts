import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { logError } from '@/lib/logger';

type UserCoinsRow = Database['public']['Tables']['user_coins']['Row'];

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
        if (import.meta.env.DEV) {
          logError('Error loading coins', error as Error);
        }
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
          const newRow = payload.new as Partial<UserCoinsRow> | null;
          if (newRow && typeof newRow.balance === 'number') {
            setCoinsData({
              balance: newRow.balance,
              lifetimeEarned: newRow.lifetime_earned ?? 0,
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
      if (import.meta.env.DEV) {
        logError('Error refetching coins', error as Error);
      }
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
