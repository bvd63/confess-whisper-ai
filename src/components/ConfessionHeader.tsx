import { memo, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { getUserDisplayName } from "@/lib/userDisplayName";
import BadgesDisplay from "./BadgesDisplay";
import { VIPBadge } from "./VIPBadge";

interface ConfessionHeaderProps {
  category: string;
  createdAt: string;
  authorNicknameSnapshot?: string | null;
  authorVisibilitySnapshot?: string | null;
  isAnonymous?: boolean;
  authorDisplayName?: string | null;
  userId?: string | null;
  subscriptionTier?: string;
}

const ConfessionHeader = memo(({ 
  category, 
  createdAt, 
  authorNicknameSnapshot, 
  authorVisibilitySnapshot,
  isAnonymous,
  authorDisplayName,
  userId,
  subscriptionTier
}: ConfessionHeaderProps) => {
  const { t } = useLanguage();
  
  const displayName = useMemo(() => {
    // New anonymity control: use is_anonymous and author_display_name_snapshot
    if (isAnonymous !== undefined) {
      return isAnonymous ? t.confession_author_anonymous : (authorDisplayName ? `@${authorDisplayName}` : t.confession_author_anonymous);
    }
    // Fallback to old behavior for backward compatibility
    return getUserDisplayName(authorNicknameSnapshot, authorVisibilitySnapshot, t.user_anonymous);
  }, [isAnonymous, authorDisplayName, authorNicknameSnapshot, authorVisibilitySnapshot, t]);
  
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
    
    if (diffInMinutes < 1) return t.time_now;
    if (diffInMinutes < 60) return `${diffInMinutes}${t.time_minutes}`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}${t.time_hours}`;
    return `${Math.floor(diffInMinutes / 1440)}${t.time_days}`;
  }, [createdAt, t]);

  return (
    <div className="flex items-center gap-2 text-muted-foreground text-sm flex-wrap">
      <div className="flex items-center gap-1 flex-wrap">
        <span>{displayName}</span>
        {userId && !isAnonymous && (
          <>
            <VIPBadge tier={subscriptionTier as 'free' | 'vip'} size="sm" />
            <BadgesDisplay userId={userId} variant="compact" />
          </>
        )}
        <span>• {timeAgo}</span>
      </div>
      <Badge variant="secondary" className="text-xs gap-1 bg-primary/10 text-primary border-primary/20">
        <Tag className="w-3 h-3" />
        {getCategoryLabel}
      </Badge>
    </div>
  );
});

ConfessionHeader.displayName = "ConfessionHeader";

export default ConfessionHeader;
