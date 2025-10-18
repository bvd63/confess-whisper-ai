import { useOptimizedQuery } from './useOptimizedQuery';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEffect } from 'react';

interface Quote {
  text_en: string;
  text_es: string;
  text_de: string;
  author: string;
  category: string;
  rotated_at: string;
}

export const useQuoteOfTheDay = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();

  const { data: qotdState, isLoading } = useOptimizedQuery({
    queryKey: ['quote-of-the-day'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_state')
        .select('value')
        .eq('key', 'quote_of_the_day')
        .single();

      if (error) throw error;
      return data?.value ? (data.value as unknown as Quote) : null;
    },
    cacheKey: 'qotd',
    cacheTTL: 60000, // 1 minute (synced with refetch)
    useCircuitBreaker: true,
    useRetry: true,
    useDedupe: true,
    refetchInterval: 60000, // Check every minute for updates
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('qotd-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'app_state',
          filter: `key=eq.quote_of_the_day`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['quote-of-the-day'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const getLocalizedQuote = () => {
    if (!qotdState) return null;
    
    const textKey = `text_${language}` as keyof Quote;
    return {
      text: qotdState[textKey] as string,
      author: qotdState.author,
      category: qotdState.category,
    };
  };

  return {
    quote: getLocalizedQuote(),
    isLoading,
    rawData: qotdState,
  };
};