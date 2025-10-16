import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
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
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-yellow-500" />
        <h3 className="text-lg font-semibold">{t.leaderboard_top_this_week}</h3>
        <TrendingUp className="w-4 h-4 text-muted-foreground ml-auto" />
      </div>

      <div className="space-y-3">
        {leaders.map((leader) => (
          <div
            key={leader.user_id}
            className="flex items-center gap-3 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors"
          >
            <div className="w-8 text-center font-bold text-primary">
              #{leader.rank}
            </div>
            
            <Avatar className="w-10 h-10">
              <AvatarFallback>
                {leader.user_id.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <p className="text-sm font-medium">{t.anonymous_user} #{leader.user_id.substring(0, 8)}</p>
              <p className="text-xs text-muted-foreground">
                {leader.confessions_count} {t.leaderboard_confessions} • {leader.total_likes} {t.leaderboard_reactions}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default Leaderboard;