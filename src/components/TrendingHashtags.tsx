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
        .eq("is_hidden", false)
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
    <AnimatedCard className="p-2.5 sm:p-3" hover="none">
      <div className="flex items-center gap-1.5 mb-2.5 sm:mb-3">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm sm:text-base">{t.hashtags_trending}</h3>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {hashtags.map(({ tag, count }) => (
          <Badge 
            key={tag}
            variant="secondary"
            className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs px-2 py-0.5"
            onClick={() => onHashtagClick?.(tag)}
          >
            <Hash className="w-3 h-3 mr-0.5" />
            {tag.replace('#', '')}
            <span className="ml-1 text-[10px] opacity-70">({count})</span>
          </Badge>
        ))}
      </div>
    </AnimatedCard>
  );
};
