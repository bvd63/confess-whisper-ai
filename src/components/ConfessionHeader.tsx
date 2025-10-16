import { memo, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";

interface ConfessionHeaderProps {
  category: string;
  createdAt: string;
}

const ConfessionHeader = memo(({ category, createdAt }: ConfessionHeaderProps) => {
  const { t } = useLanguage();
  
  const getCategoryLabel = useMemo(() => {
    const categoryMap: Record<string, string> = {
      relationships: t.category_relationships,
      work: t.category_work,
      family: t.category_family,
      health: t.category_health,
      money: t.category_money,
      other: t.category_other,
    };
    return categoryMap[category] || t.category_other;
  }, [category, t]);
  
  const timeAgo = useMemo(() => {
    const now = new Date();
    const confessionDate = new Date(createdAt);
    const diffInMinutes = Math.floor((now.getTime() - confessionDate.getTime()) / 60000);
    
    if (diffInMinutes < 1) return 'acum';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}z`;
  }, [createdAt]);

  return (
    <div className="flex items-center gap-2 text-muted-foreground text-sm flex-wrap">
      <MessageCircle className="w-4 h-4" />
      <span>Anonim • {timeAgo}</span>
      <Badge variant="secondary" className="text-xs gap-1 bg-primary/10 text-primary border-primary/20">
        <Tag className="w-3 h-3" />
        {getCategoryLabel}
      </Badge>
    </div>
  );
});

ConfessionHeader.displayName = "ConfessionHeader";

export default ConfessionHeader;
