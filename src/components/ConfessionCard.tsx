import { useState, memo, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Shield, User as UserIcon, Zap, Clock3, MessageCircle } from "lucide-react";
import ReactionPicker from "./ReactionPicker";
import { useVipStatus } from "@/hooks/usePremiumStatus";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useSensitiveContent } from "@/hooks/useSensitiveContent";
import { SensitiveContentWarning } from "./SensitiveContentWarning";
import { NoScreenshotMode } from "./NoScreenshotMode";
import { sanitizeConfession } from "@/lib/security/sanitizer";
import { Card } from "@/components/ui/card";
import ConfessionActions from "./ConfessionActions";
import ShareDialog from "./ShareDialog";
import { getBoostStatus } from "@/lib/boosts";

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
  from?: string;
}

const ConfessionCard = ({ confession, isVip: _isVip, onUpgradeClick: _onUpgradeClick, onInsightGenerated: _onInsightGenerated, onCommentChange: _onCommentChange, isLiked, isBookmarked, onLikeChange, onBookmarkChange, from }: ConfessionCardProps) => {
  const navigate = useNavigate();
  const [boostExpiresAt, setBoostExpiresAt] = useState<string | null>(confession.boost_expires_at || null);
  const [shareOpen, setShareOpen] = useState(false);
  const { user } = useCurrentUser();
  const { t } = useLanguage();
  const { subscriptionTier } = useVipStatus(confession.user_id || null);
  const { isSensitive } = useSensitiveContent(confession.content);

  const noScreenshotEnabled = subscriptionTier === 'vip' && user?.id === confession.user_id;

  const handleCardClick = () => {
    navigate(`/confession/${confession.id}`, { state: from ? { from } : undefined });
  };

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
  const { isBoosted, hoursLeft, lessThanHour } = useMemo(() => getBoostStatus(boostExpiresAt), [boostExpiresAt]);
  const boostTimeLabel = useMemo(() => {
    if (!isBoosted) return null;
    return lessThanHour ? '<1h' : `${hoursLeft}h`;
  }, [isBoosted, hoursLeft, lessThanHour]);

  useEffect(() => {
    setBoostExpiresAt(confession.boost_expires_at || null);
  }, [confession.id, confession.boost_expires_at]);

  return (
    <NoScreenshotMode enabled={noScreenshotEnabled}>
      <Card className="w-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#2a2e5c] via-[#19192f] to-[#0d0d1b] p-5 sm:p-6 space-y-5 shadow-[0_20px_50px_rgba(0,0,0,0.45)] cursor-pointer hover:border-white/20 transition-colors" onClick={handleCardClick}>
        <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/70 via-primary/60 to-accent/70 flex items-center justify-center shadow-lg shadow-primary/30">
              <AvatarIcon className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-white truncate">{displayName}</span>
                {subscriptionTier === 'vip' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-[11px] uppercase tracking-wide flex-shrink-0">
                    <Crown className="w-3.5 h-3.5 text-vip-gold" />
                    VIP
                  </span>
                )}
                {isBoosted && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400/90 via-amber-500 to-orange-500 text-[12px] font-semibold text-black shadow-lg border border-amber-200/70 flex-shrink-0">
                    <Zap className="w-4 h-4" />
                    <span>{t.boost_badge}</span>
                    {boostTimeLabel && (
                      <span className="inline-flex items-center text-[11px] font-medium text-black/80 flex-shrink-0">
                        <Clock3 className="w-3.5 h-3.5 mr-1" />
                        {t.boost_expiry_in?.replace('{time}', boostTimeLabel)}
                      </span>
                    )}
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs text-white/70">
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

          <div className="flex items-center gap-3 text-white/70 text-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              <span>{confession.comments_count || 0} {t.comments_title || 'comments'}</span>
            </div>
          </div>
        </Card>
      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} confessionId={confession.id} />
    </NoScreenshotMode>
  );
};

export default memo(ConfessionCard);
