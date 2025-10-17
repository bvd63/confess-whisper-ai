import { Quote } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuoteOfTheDay } from '@/hooks/useQuoteOfTheDay';

export const QuoteOfTheDay = () => {
  const { quote, isLoading } = useQuoteOfTheDay();

  if (isLoading) {
    return (
      <Card className="p-4 mb-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-6 w-6 rounded flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      </Card>
    );
  }

  if (!quote) return null;

  return (
    <Card className="p-4 mb-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <div className="flex items-start gap-3">
        <Quote className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
        <div className="flex-1">
          <p className="text-base font-medium leading-relaxed mb-2">
            "{quote.text}"
          </p>
          {quote.author && (
            <p className="text-sm text-muted-foreground">
              — {quote.author}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};