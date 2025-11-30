import { Quote } from 'lucide-react';
import { AnimatedCard } from '@/components/AnimatedCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDailyQuote } from '@/hooks/useDailyQuote';

export const QuoteOfTheDay = () => {
  const quote = useDailyQuote();
  const { language } = useLanguage();
  const localizedText = quote[language] ?? quote.en;

  return <AnimatedCard hover="glow" gradient className="p-2.5 sm:p-3 mb-3 sm:mb-4 border-primary/20">
      <div className="flex items-start gap-2">
        <Quote className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-xs sm:text-sm font-medium leading-relaxed mb-1.5">
            "{localizedText}"
          </p>
          {quote.author && <p className="text-xs text-muted-foreground">
              — {quote.author}
            </p>}
        </div>
      </div>
    </AnimatedCard>;
};