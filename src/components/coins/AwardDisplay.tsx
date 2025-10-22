import { Star, Heart, Flame, Diamond } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AwardDisplayProps {
  confessionId: string;
}

const AWARD_ICONS = {
  star: { icon: Star, color: 'text-yellow-500' },
  heart: { icon: Heart, color: 'text-red-500' },
  fire: { icon: Flame, color: 'text-orange-500' },
  diamond: { icon: Diamond, color: 'text-blue-500' },
};

export const AwardDisplay = ({ confessionId }: AwardDisplayProps) => {
  const { data: awards } = useQuery({
    queryKey: ['confessionAwards', confessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_confession_awards', { confession_id_param: confessionId });

      if (error) throw error;

      // Convert array to object with counts
      const counts = (data || []).reduce((acc: Record<string, number>, award: any) => {
        acc[award.award_type] = parseInt(award.award_count);
        return acc;
      }, {} as Record<string, number>);

      return counts;
    },
  });

  if (!awards || Object.keys(awards).length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {Object.entries(awards).map(([type, count]) => {
        const award = AWARD_ICONS[type as keyof typeof AWARD_ICONS];
        if (!award) return null;

        const Icon = award.icon;
        return (
          <div
            key={type}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary/50"
          >
            <Icon className={cn('w-4 h-4', award.color)} />
            <span className="text-xs font-semibold">{count}</span>
          </div>
        );
      })}
    </div>
  );
};
