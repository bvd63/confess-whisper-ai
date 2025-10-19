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
    return <AnimatedCard className="p-4 mb-4" hover="none">
        <div className="flex items-start gap-3">
          <Skeleton className="h-6 w-6 rounded flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      </AnimatedCard>;
  }
  if (!quote) return null;
  return <AnimatedCard hover="glow" gradient className="p-4 mb-4 border-primary/20">
      <div className="flex items-start gap-3">
        <FloatingElement delay={0.3}>
          <Quote className="h-6 w-6 text-primary flex-shrink-0 mt-1 px-0 my-0 py-0 mx-[11px]" />
        </FloatingElement>
        <div className="flex-1">
          <p className="text-base font-medium leading-relaxed mb-2">
            "{quote.text}"
          </p>
          {quote.author && <p className="text-sm text-muted-foreground">
              — {quote.author}
            </p>}
        </div>
      </div>
    </AnimatedCard>;
};