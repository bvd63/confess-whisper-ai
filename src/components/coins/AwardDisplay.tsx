import { Star, Heart, Flame, Diamond } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

interface AwardDisplayProps {
  confessionId: string;
}

const AWARD_ICONS = {
  star: { icon: Star, color: 'text-yellow-500' },
  heart: { icon: Heart, color: 'text-red-500' },
  fire: { icon: Flame, color: 'text-orange-500' },
  diamond: { icon: Diamond, color: 'text-blue-500' },
};

const GET_CONFESSION_AWARDS_FN = 'get_confession_awards' as unknown as keyof Database['public']['Functions'];

interface ConfessionAwardAggregate {
  award_type: string;
  award_count: number | string;
}

export const AwardDisplay = ({ confessionId }: AwardDisplayProps) => {
  const { data: awards } = useQuery({
    queryKey: ['confessionAwards', confessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc(GET_CONFESSION_AWARDS_FN, { confession_id_param: confessionId });

      if (error) throw error;

      // Convert array to object with counts
      const awardsArray: ConfessionAwardAggregate[] = Array.isArray(data) ? data : [];
      const counts = awardsArray.reduce((acc: Record<string, number>, award) => {
        const parsedCount = Number(award.award_count);
        acc[award.award_type] = Number.isNaN(parsedCount) ? 0 : parsedCount;
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
            <span className="text-xs font-semibold">{String(count)}</span>
          </div>
        );
      })}
    </div>
  );
};
