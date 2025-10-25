import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface KarmaData {
  points: number;
  level: string;
  nextLevelPoints: number;
  isLoading: boolean;
}

const KARMA_LEVELS = [
  { name: 'Newcomer', threshold: 0 },
  { name: 'Regular', threshold: 50 },
  { name: 'Active', threshold: 150 },
  { name: 'Veteran', threshold: 500 },
  { name: 'Legend', threshold: 1500 },
];

export function useKarma(userId: string | null | undefined) {
  const [karma, setKarma] = useState<KarmaData>({
    points: 0,
    level: 'Newcomer',
    nextLevelPoints: 50,
    isLoading: true,
  });

  useEffect(() => {
    if (!userId) {
      setKarma({
        points: 0,
        level: 'Newcomer',
        nextLevelPoints: 50,
        isLoading: false,
      });
      return;
    }

    const calculateKarma = async () => {
      try {
        // Get confession count (+1 each)
        const { count: confessionCount } = await supabase
          .from('confessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        // Get all confession IDs for this user first
        const { data: userConfessions } = await supabase
          .from('confessions')
          .select('id')
          .eq('user_id', userId);

        const confessionIds = userConfessions?.map(c => c.id) || [];

        // Get likes received (+2 each)
        let likesCount = 0;
        if (confessionIds.length > 0) {
          try {
            // Using type assertion as likes table exists but may not be in generated types
            const { data: likesData } = await (supabase as any)
              .from('likes')
              .select('id')
              .in('confession_id', confessionIds);
            likesCount = likesData?.length || 0;
          } catch (error) {
            console.error('Error fetching likes:', error);
            likesCount = 0;
          }
        }

        // Get comments made (+3 each)
        const { count: commentsCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        const totalPoints = 
          (confessionCount || 0) * 1 + 
          likesCount * 2 + 
          (commentsCount || 0) * 3;

        // Calculate level
        let currentLevel = KARMA_LEVELS[0];
        let nextLevel = KARMA_LEVELS[1];

        for (let i = KARMA_LEVELS.length - 1; i >= 0; i--) {
          if (totalPoints >= KARMA_LEVELS[i].threshold) {
            currentLevel = KARMA_LEVELS[i];
            nextLevel = KARMA_LEVELS[i + 1] || KARMA_LEVELS[i];
            break;
          }
        }

        setKarma({
          points: totalPoints,
          level: currentLevel.name,
          nextLevelPoints: nextLevel.threshold,
          isLoading: false,
        });
      } catch (error) {
        console.error('Error calculating karma:', error);
        setKarma(prev => ({ ...prev, isLoading: false }));
      }
    };

    calculateKarma();
  }, [userId]);

  return karma;
}
