import { useState, memo, useMemo } from "react";
import { Crown, Shield, User as UserIcon } from "lucide-react";
import CommentsSection from "./CommentsSection";
import ReactionPicker from "./ReactionPicker";
import { useVipStatus } from "@/hooks/usePremiumStatus";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useSensitiveContent } from "@/hooks/useSensitiveContent";
import { SensitiveContentWarning } from "./SensitiveContentWarning";
import { NoScreenshotMode } from "./NoScreenshotMode";
import { sanitizeConfession } from "@/lib/security/sanitizer";
import { Card } from "@/components/ui/card";

interface ConfessionCardProps {
  confession: {
    id: string;
    content: string;
    category: string;
    user_id?: string | null;
    ai_response?: string | null;
    ai_deep_insight?: string | null;
    likes_count?: number;
    comments_count?: number;
    created_at: string;
    image_url?: string | null;
    image_blurred?: boolean;
    author_nickname_snapshot?: string | null;
    author_visibility_snapshot?: string | null;
    emotional_tone?: string | null;
    is_anonymous?: boolean;
    author_display_name_snapshot?: string | null;
    boost_expires_at?: string | null;
  };
  isVip: boolean;
  isLiked?: boolean;
  isBookmarked?: boolean;
  onReport?: (id: string) => void;
  onUpgradeClick: () => void;
  onInsightGenerated: () => void;
  onLikeChange?: () => void;
  onCommentChange?: () => void;
  onBookmarkChange?: () => void;
}

const ConfessionCard = ({ confession, isVip: _isVip, onUpgradeClick: _onUpgradeClick, onInsightGenerated: _onInsightGenerated, onCommentChange }: ConfessionCardProps) => {
  const [commentsCount, setCommentsCount] = useState(confession.comments_count || 0);
  const { user } = useCurrentUser();
  const { t } = useLanguage();
  const { subscriptionTier } = useVipStatus(confession.user_id || null);
  const { isSensitive } = useSensitiveContent(confession.content);

  const noScreenshotEnabled = subscriptionTier === 'vip' && user?.id === confession.user_id;

  const displayName = useMemo(() => {
    if (confession.is_anonymous !== undefined) {
      return confession.is_anonymous
        ? t.confession_author_anonymous
        : `@${confession.author_display_name_snapshot || confession.author_nickname_snapshot || t.user_anonymous}`;
    }
    return confession.author_display_name_snapshot || confession.author_nickname_snapshot || t.user_anonymous;
  }, [confession.author_display_name_snapshot, confession.author_nickname_snapshot, confession.is_anonymous, t]);

  const timeAgo = useMemo(() => {
    const now = new Date();
    const confessionDate = new Date(confession.created_at);
    const diffInMinutes = Math.floor((now.getTime() - confessionDate.getTime()) / 60000);
    if (diffInMinutes < 1) return t.time_now;
    if (diffInMinutes < 60) return `${diffInMinutes}${t.time_minutes}`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}${t.time_hours}`;
    return `${Math.floor(diffInMinutes / 1440)}${t.time_days}`;
  }, [confession.created_at, t]);

  const visibilityLabel = t.profile_privacy_public || 'Public';
  const AvatarIcon = confession.is_anonymous ? Shield : UserIcon;

  return (
    <NoScreenshotMode enabled={noScreenshotEnabled}>
      <Card className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#2a2e5c] via-[#19192f] to-[#0d0d1b] p-5 sm:p-6 space-y-5 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/70 via-primary/60 to-accent/70 flex items-center justify-center shadow-lg shadow-primary/30">
            <AvatarIcon className="w-4 h-4 text-white" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <span>{displayName}</span>
              {subscriptionTier === 'vip' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-[11px] uppercase tracking-wide">
                  <Crown className="w-3.5 h-3.5 text-vip-gold" />
                  VIP
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-white/70">
              <span>{timeAgo}</span>
              <span>·</span>
              <span>{visibilityLabel}</span>
            </div>
          </div>
        </div>

        <SensitiveContentWarning isSensitive={isSensitive}>
          <p className="text-base leading-relaxed text-white/90 break-words">
            {sanitizeConfession(confession.content)}
          </p>
        </SensitiveContentWarning>

        <div className="rounded-2xl border border-white/8 bg-white/5 p-3 shadow-inner">
          <ReactionPicker confessionId={confession.id} userId={user?.id} />
        </div>

        <CommentsSection
          confessionId={confession.id}
          confessionOwnerId={confession.user_id || ''}
          commentsCount={commentsCount}
          onCommentChange={() => {
            setCommentsCount(prev => prev + 1);
            onCommentChange?.();
          }}
        />
      </Card>
    </NoScreenshotMode>
  );
};

export default memo(ConfessionCard);
