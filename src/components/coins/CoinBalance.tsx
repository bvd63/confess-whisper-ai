import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Coins, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import CoinShop from './CoinShop';

export default function CoinBalance() {
  const [shopOpen, setShopOpen] = useState(false);
  const { t } = useLanguage();

  const { data: balance, refetch } = useQuery({
    queryKey: ['coin-balance'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { data, error } = await supabase
        .from('user_coins')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) return 0;
      return data?.balance || 0;
    },
    refetchInterval: 10000, // Refresh every 10s
  });

  // Listen for coin balance updates on user_coins table
  useEffect(() => {
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel(`coin-balance-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_coins',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            console.log('[CoinBalance] Realtime update received, refetching...');
            refetch();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupRealtime();
  }, [refetch]);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShopOpen(true)}
        className="flex items-center gap-2 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-500/50 hover:border-yellow-500"
      >
        <Coins className="w-4 h-4 text-yellow-600" />
        <span className="font-bold text-yellow-600">
          {balance?.toLocaleString() || 0}
        </span>
        <Plus className="w-3 h-3 text-yellow-600" />
      </Button>

      <CoinShop open={shopOpen} onOpenChange={setShopOpen} />
    </>
  );
}
