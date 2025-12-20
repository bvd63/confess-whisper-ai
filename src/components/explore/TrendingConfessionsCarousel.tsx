import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { Flame, Heart, MessageCircle } from "lucide-react";
import { sanitizeConfession } from "@/lib/security/sanitizer";
import { attachActiveBoosts } from "@/lib/boosts";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface TrendingConfession {
  id: string;
  content: string;
  category: string;
  likes_count: number | null;
  comments_count: number;
  created_at: string;
}

const TrendingConfessionCard = ({ confession }: { confession: TrendingConfession }) => {
  const navigate = useNavigate();
  
  const truncatedContent = confession.content.length > 80 
    ? confession.content.slice(0, 80) + "..." 
    : confession.content;

  return (
    <div
      onClick={() => navigate(`/confession/${confession.id}`)}
      className="min-w-[160px] max-w-[160px] h-[140px] flex-shrink-0 rounded-2xl p-3.5 cursor-pointer 
        bg-gradient-to-br from-[#2a2e5c]/90 via-[#19192f]/90 to-[#0d0d1b]/90 
        backdrop-blur-md border border-white/10 
        hover:border-white/20 hover:shadow-[0_10px_30px_rgba(139,92,246,0.2)]
        transition-all duration-300 flex flex-col justify-between"
    >
      <p className="text-xs leading-relaxed text-white/85 line-clamp-4">
        {sanitizeConfession(truncatedContent)}
      </p>
      
      <div className="flex items-center gap-3 mt-2">
        <div className="flex items-center gap-1 text-white/50">
          <Heart className="w-3 h-3" />
          <span className="text-[10px]">{confession.likes_count || 0}</span>
        </div>
        <div className="flex items-center gap-1 text-white/50">
          <MessageCircle className="w-3 h-3" />
          <span className="text-[10px]">{confession.comments_count || 0}</span>
        </div>
      </div>
    </div>
  );
};

export const TrendingConfessionsCarousel = () => {
  const { t } = useLanguage();
  
  const { data: confessions, isLoading } = useQuery({
    queryKey: ["trending-carousel-confessions"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_hot_confessions", {
        limit_count: 10,
      });
      if (error) throw error;
      const boostedData = await attachActiveBoosts(data || []);
      return boostedData as TrendingConfession[];
    },
    refetchInterval: 5 * 60 * 1000,
  });

  if (isLoading || !confessions || confessions.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          {t.explore_trending_confessions}
          <Flame className="w-4 h-4 text-orange-400" />
        </h2>
      </div>
      
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 pb-2">
          {confessions.map((confession) => (
            <TrendingConfessionCard key={confession.id} confession={confession} />
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="h-1.5" />
      </ScrollArea>
    </div>
  );
};
