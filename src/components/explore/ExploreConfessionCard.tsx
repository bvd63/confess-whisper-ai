import { memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { sanitizeConfession } from "@/lib/security/sanitizer";
import { Badge } from "@/components/ui/badge";

interface ExploreConfessionCardProps {
  confession: {
    id: string;
    content: string;
    category: string;
    likes_count?: number | null;
    comments_count?: number;
    created_at: string;
  };
}

const categoryColors: Record<string, string> = {
  relationships: "bg-pink-500/20 text-pink-300 border-pink-400/30",
  work: "bg-blue-500/20 text-blue-300 border-blue-400/30",
  family: "bg-green-500/20 text-green-300 border-green-400/30",
  health: "bg-red-500/20 text-red-300 border-red-400/30",
  money: "bg-yellow-500/20 text-yellow-300 border-yellow-400/30",
  other: "bg-purple-500/20 text-purple-300 border-purple-400/30",
};

const ExploreConfessionCard = memo(({ confession }: ExploreConfessionCardProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const categoryKey = `category_${confession.category}` as keyof typeof t;
  const categoryLabel = (t[categoryKey] as string) || confession.category;
  const categoryStyle = categoryColors[confession.category] || categoryColors.other;

  return (
    <div
      onClick={() => navigate(`/confession/${confession.id}`)}
      className="w-full rounded-xl p-3 cursor-pointer 
        bg-gradient-to-br from-[#2c3258]/85 via-[#1a1c34]/85 to-[#0f1022]/90 
        backdrop-blur-lg border border-white/12 
        hover:border-white/20 hover:shadow-[0_18px_42px_rgba(139,92,246,0.16)]
        transition-all duration-300 space-y-2"
    >
      {/* Content */}
      <p className="text-sm leading-snug text-white/90 break-words line-clamp-3">
        {sanitizeConfession(confession.content)}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-white/70">
            <Heart className="w-4 h-4" />
            <span className="text-[13px] leading-none">{confession.likes_count || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/70">
            <MessageCircle className="w-4 h-4" />
            <span className="text-[13px] leading-none">{confession.comments_count || 0}</span>
          </div>
        </div>

        <Badge 
          variant="outline" 
          className={`text-[10px] px-2 py-0.5 border ${categoryStyle}`}
        >
          {categoryLabel}
        </Badge>
      </div>
    </div>
  );
});

ExploreConfessionCard.displayName = "ExploreConfessionCard";

export default ExploreConfessionCard;
