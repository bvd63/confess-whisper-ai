import { Trophy, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useKarma } from '@/hooks/useKarma';
import { useLanguage } from '@/contexts/LanguageContext';

interface KarmaDisplayProps {
  userId: string | null | undefined;
  variant?: 'full' | 'compact';
}

export const KarmaDisplay = ({ userId, variant = 'full' }: KarmaDisplayProps) => {
  const { points, level, nextLevelPoints, isLoading } = useKarma(userId);
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-20 bg-muted rounded-lg" />
      </div>
    );
  }

  if (!userId) return null;

  const progress = nextLevelPoints > 0 
    ? ((points / nextLevelPoints) * 100) 
    : 100;

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Trophy className="h-4 w-4 text-primary" />
        <span className="font-semibold">{points}</span>
        <span className="text-muted-foreground">· {level}</span>
      </div>
    );
  }

  return (
    <Card className="p-4 bg-gradient-to-br from-card to-primary/5 border-primary/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">{t.karma_points}</p>
            <p className="text-2xl font-bold text-primary">{points}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{t.karma_level}</p>
          <p className="text-lg font-semibold">{level}</p>
        </div>
      </div>
      
      {progress < 100 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {t.karma_next_level}
            </span>
            <span>{nextLevelPoints - points} {t.karma_points_to_go}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}
    </Card>
  );
};
