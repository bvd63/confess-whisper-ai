import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedCard } from "@/components/AnimatedCard";
import { UserDisplayName } from "@/components/UserDisplayName";
import { Trophy, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage } from "@/contexts/LanguageContext";

interface LeaderboardEntry {
  user_id: string;
  confessions_count: number;
  total_likes: number;
  rank: number;
}

const Leaderboard = () => {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    // Get top users from last 7 days based on engagement
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: confessions } = await supabase
      .from('confessions')
      .select('user_id, likes_count, comments_count')
      .gte('created_at', sevenDaysAgo.toISOString());

    if (confessions) {
      // Aggregate by user
      const userStats = new Map<string, { confessions: number; likes: number }>();
      
      confessions.forEach((c) => {
        if (!c.user_id) return;
        const current = userStats.get(c.user_id) || { confessions: 0, likes: 0 };
        current.confessions += 1;
        current.likes += c.likes_count || 0;
        userStats.set(c.user_id, current);
      });

      // Convert to array and sort
      const leaderboard = Array.from(userStats.entries())
        .map(([user_id, stats]) => ({
          user_id,
          confessions_count: stats.confessions,
          total_likes: stats.likes,
          rank: 0,
        }))
        .sort((a, b) => b.total_likes - a.total_likes)
        .slice(0, 10)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      setLeaders(leaderboard);
    }
    setLoading(false);
  };

  if (loading) return null;
  if (leaders.length === 0) return null;

  return (
    <AnimatedCard 
      hover="lift"
      glass
      gradient
      className="p-3 sm:p-4"
    >
      <div className="flex items-center gap-1.5 sm:gap-2 mb-3">
          <Trophy className="w-4 h-4 text-yellow-500" />
        <h3 className="text-sm sm:text-base font-semibold">{t.leaderboard_top_this_week}</h3>
        <TrendingUp className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        {leaders.map((leader, index) => (
          <div
            key={leader.user_id}
            className="flex items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-lg glass hover-lift transition-all animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="w-6 sm:w-7 text-center font-bold text-xs sm:text-sm text-primary">
              #{leader.rank}
            </div>
            
            <Avatar className="w-8 h-8">
              <AvatarFallback className="text-xs">
                {leader.user_id.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium truncate">
                <UserDisplayName 
                  userId={leader.user_id}
                  maxLength={20}
                  className="inline"
                  clickable={false}
                />
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                {leader.confessions_count} {t.leaderboard_confessions} • {leader.total_likes} {t.leaderboard_reactions}
              </p>
            </div>
          </div>
        ))}
      </div>
    </AnimatedCard>
  );
};

export default Leaderboard;