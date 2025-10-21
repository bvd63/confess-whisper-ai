import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedCard } from "@/components/AnimatedCard";
import { Hash, TrendingUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";

interface TrendingHashtagsProps {
  onHashtagClick?: (hashtag: string) => void;
}

export const TrendingHashtags = ({ onHashtagClick }: TrendingHashtagsProps) => {
  const { t } = useLanguage();

  const { data: hashtags, isLoading } = useQuery({
    queryKey: ["trending-hashtags"],
    queryFn: async () => {
      // Get recent confessions and extract hashtags
      const { data, error } = await supabase
        .from("confessions")
        .select("content")
        .eq("moderation_status", "approved")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Extract and count hashtags
      const hashtagMap = new Map<string, number>();
      data.forEach(confession => {
        const hashtags = confession.content.match(/#\w+/g) || [];
        hashtags.forEach(tag => {
          const normalized = tag.toLowerCase();
          hashtagMap.set(normalized, (hashtagMap.get(normalized) || 0) + 1);
        });
      });

      // Convert to array and sort by count
      return Array.from(hashtagMap.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  if (isLoading || !hashtags || hashtags.length === 0) return null;

  return (
    <AnimatedCard className="p-4 sm:p-6" hover="none">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">{t.hashtags_trending}</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {hashtags.map(({ tag, count }) => (
          <Badge 
            key={tag}
            variant="secondary"
            className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
            onClick={() => onHashtagClick?.(tag)}
          >
            <Hash className="w-3 h-3 mr-1" />
            {tag.replace('#', '')}
            <span className="ml-1 text-xs opacity-70">({count})</span>
          </Badge>
        ))}
      </div>
    </AnimatedCard>
  );
};
