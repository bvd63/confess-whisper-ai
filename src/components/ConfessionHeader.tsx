import { memo, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { getUserDisplayName } from "@/lib/userDisplayName";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Crown, Tag } from "lucide-react";

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

  const initials = useMemo(() => {
    const safeName = displayName.replace('@', '').trim();
    if (!safeName) return 'A';
    return safeName
      .split(' ')
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
  }, [displayName]);
  
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

  const visibilityLabel = isAnonymous ? t.confession_visibility_anonymous : t.confession_visibility_public;

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12 border border-white/10 bg-white/5">
          <AvatarFallback className="bg-gradient-to-br from-primary/40 via-purple-500/30 to-indigo-500/30 text-white font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-white">
            <span className="font-semibold leading-none">{displayName}</span>
            {!isAnonymous && subscriptionTier === 'vip' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                <Crown className="h-3 w-3" />
                VIP
              </span>
            )}
          </div>
          <p className="text-xs text-white/70">
            {timeAgo} · {visibilityLabel}
          </p>
        </div>
      </div>
      <Badge variant="secondary" className="gap-1 rounded-full border-white/10 bg-white/5 text-xs text-white/80">
        <Tag className="h-3 w-3" />
        {getCategoryLabel}
      </Badge>
    </div>
  );
});

ConfessionHeader.displayName = "ConfessionHeader";

export default ConfessionHeader;
