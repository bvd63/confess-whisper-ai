import { Quote } from 'lucide-react';
import { AnimatedCard } from '@/components/AnimatedCard';
import { FloatingElement } from '@/components/FloatingElement';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuoteOfTheDay } from '@/hooks/useQuoteOfTheDay';
export const QuoteOfTheDay = () => {
  const {
    quote,
    isLoading
  } = useQuoteOfTheDay();
  if (isLoading) {
    return <AnimatedCard className="p-2.5 sm:p-3 mb-3 sm:mb-4" hover="none">
        <div className="flex items-start gap-2">
          <Skeleton className="h-5 w-5 rounded flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/4" />
          </div>
        </div>
      </AnimatedCard>;
  }
  if (!quote) return null;
  return <AnimatedCard hover="glow" gradient className="p-2.5 sm:p-3 mb-3 sm:mb-4 border-primary/20">
      <div className="flex items-start gap-2">
        <Quote className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-xs sm:text-sm font-medium leading-relaxed mb-1.5">
            "{quote.text}"
          </p>
          {quote.author && <p className="text-xs text-muted-foreground">
              — {quote.author}
            </p>}
        </div>
      </div>
    </AnimatedCard>;
};