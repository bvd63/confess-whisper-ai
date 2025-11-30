import { useEffect, useState } from 'react';
import type { DailyQuote } from '@/data/dailyQuotes';
import { getTodayQuote } from '@/utils/dailyQuoteManager';

const REFRESH_INTERVAL_MS = 30_000;

export const useDailyQuote = (): DailyQuote => {
  const [quote, setQuote] = useState<DailyQuote>(() => getTodayQuote());

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const applyLatestQuote = () => {
      const latest = getTodayQuote();
      setQuote((current) => (current.id === latest.id ? current : latest));
    };

    const intervalId = window.setInterval(applyLatestQuote, REFRESH_INTERVAL_MS);
    window.addEventListener('storage', applyLatestQuote);

    // Ensure hydration picks up any updated quote immediately
    applyLatestQuote();

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('storage', applyLatestQuote);
    };
  }, []);

  return quote;
};
