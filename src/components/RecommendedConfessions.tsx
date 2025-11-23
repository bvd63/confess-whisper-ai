import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

interface RecommendedConfessionsProps {
  userId: string;
  currentCategory?: string;
}

interface Confession {
  id: string;
  content: string;
  category: string;
  likes_count: number;
  created_at: string;
}

const RecommendedConfessions = ({ userId, currentCategory }: RecommendedConfessionsProps) => {
  const [recommendations, setRecommendations] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const loadRecommendations = useCallback(async () => {
    // Get user's interaction history
    const { data: userLikes } = await supabase
      .from('user_likes')
      .select('confession_id, confessions(category)')
      .eq('user_id', userId)
      .limit(10);

    // Get user's mood history
    const { data: userMoods } = await supabase
      .from('mood_entries')
      .select('mood')
      .eq('user_id', userId)
      .limit(10);

    // Build query based on preferences
    let query = supabase
      .from('confessions')
      .select('id, content, category, likes_count, created_at')
      .neq('user_id', userId) // Don't recommend own confessions
      .order('created_at', { ascending: false })
      .limit(5);

    // If we have category preference, use it
    if (currentCategory && currentCategory !== 'all') {
      query = query.eq('category', currentCategory);
    } else if (userLikes && userLikes.length > 0) {
      // Find most liked categories
      const categoryCount = new Map<string, number>();
      userLikes.forEach(like => {
        const confession = Array.isArray(like.confessions) ? like.confessions[0] : like.confessions;
        if (confession?.category) {
          const cat = confession.category as string;
          categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
        }
      });
      
      const topCategory = Array.from(categoryCount.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0];
      
      if (topCategory) {
        query = query.eq('category', topCategory);
      }
    }

    const { data, error } = await query;

    if (!error && data) {
      setRecommendations(data);
    }
    setLoading(false);
  }, [currentCategory, userId]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  if (loading || recommendations.length === 0) return null;

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/10">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">{t.recommended_for_you}</h3>
      </div>

      <div className="space-y-3">
        {recommendations.slice(0, 3).map((confession) => (
          <div
            key={confession.id}
            className="p-4 bg-card rounded-lg border border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
            onClick={() => window.location.reload()} // Simplified - in real app would scroll to confession
          >
            <p className="text-sm text-muted-foreground mb-2 capitalize">
              {confession.category}
            </p>
            <p className="text-sm line-clamp-2">
              {confession.content}
            </p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">
                {confession.likes_count} {t.leaderboard_reactions}
              </span>
              <Button variant="ghost" size="sm" className="gap-1">
                <span className="text-xs">{t.recommended_read}</span>
                <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default RecommendedConfessions;