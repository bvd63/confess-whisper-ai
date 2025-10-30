import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2 } from 'lucide-react';

export const LoadingQuotes = () => {
  const { t } = useLanguage();
  const [currentQuote, setCurrentQuote] = useState(0);

  const quotes = [
    t.loading_quote_1,
    t.loading_quote_2,
    t.loading_quote_3
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % quotes.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [quotes.length]);

  return (
    <div className="flex flex-col items-center justify-center gap-2.5 sm:gap-3 p-4 sm:p-6">
      <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
      <p className="text-xs sm:text-sm text-muted-foreground text-center italic animate-fade-in">
        {quotes[currentQuote]}
      </p>
    </div>
  );
};
