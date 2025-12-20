import { useState, memo, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, User as UserIcon, Zap, Clock3, MessageCircle, Crown } from "lucide-react";
import ReactionPicker from "./ReactionPicker";
import { useVipStatus } from "@/hooks/usePremiumStatus";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useSensitiveContent } from "@/hooks/useSensitiveContent";
import { SensitiveContentWarning } from "./SensitiveContentWarning";
import { NoScreenshotMode } from "./NoScreenshotMode";
import { sanitizeConfession } from "@/lib/security/sanitizer";
import { Card } from "@/components/ui/card";
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
    moderation_status?: string | null;
    is_hidden?: boolean | null;
    moderation_reason?: string | null;
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
  const { user } = useCurrentUser();
  const { t, language } = useLanguage();
  const { subscriptionTier } = useVipStatus(confession.user_id || null);
  const { isSensitive } = useSensitiveContent(confession.content);

  const statusLabel = useMemo(() => {
    if (!user || user.id !== confession.user_id) return null;
    if (confession.moderation_status !== "pending") return null;
    const map: Record<string, string> = {
      en: "Checking…",
      es: "Verificando…",
      de: "Wird geprüft…",
    };
    return map[language] ?? map.en;
  }, [confession.moderation_status, confession.user_id, language, user]);

  const noScreenshotEnabled = subscriptionTier === 'vip' && user?.id === confession.user_id;

  const handleCardClick = () => {
    navigate(`/confession/${confession.id}`, { state: from ? { from } : undefined });
  };

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
      <Card className="w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-white/12 bg-gradient-to-br from-[#2f345f]/95 via-[#16162b]/95 to-[#0a0a16]/95 backdrop-blur-xl p-4 sm:p-5 md:p-6 space-y-3 shadow-[0_18px_45px_rgba(0,0,0,0.52),_inset_0_1px_1px_rgba(255,255,255,0.12)] cursor-pointer hover:border-white/20 hover:shadow-[0_24px_55px_rgba(139,92,246,0.26),_inset_0_1px_1px_rgba(255,255,255,0.16)] transition-all duration-300" onClick={handleCardClick}>
        {/* Header: Avatar + Username + VIP Badge */}
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/70 via-primary/60 to-accent/70 flex items-center justify-center shadow-lg shadow-primary/30 flex-shrink-0">
            <AvatarIcon className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-white truncate">{displayName}</span>
              {subscriptionTier === 'vip' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-400/30 text-[10px] font-semibold text-amber-300 backdrop-blur-sm">
                  <Crown className="w-3 h-3" />
                  VIP
                </span>
              )}
              {statusLabel && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-[10px] font-semibold text-white/90 backdrop-blur-sm">
                  {statusLabel}
                </span>
              )}
              {isBoosted && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400/90 via-amber-500 to-orange-500 text-[11px] font-semibold text-black shadow-lg border border-amber-200/70 flex-shrink-0">
                  <Zap className="w-3 h-3" />
                  <span>{t.boost_badge}</span>
                  {boostTimeLabel && (
                    <span className="inline-flex items-center text-[10px] font-medium text-black/80 flex-shrink-0">
                      <Clock3 className="w-3 h-3 mr-0.5" />
                      {t.boost_expiry_in?.replace('{time}', boostTimeLabel)}
                    </span>
                  )}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-white/60">
              <span>{timeAgo}</span>
              <span>•</span>
              <span>{visibilityLabel}</span>
            </div>
          </div>
        </div>

        {/* Confession Content */}
        <SensitiveContentWarning isSensitive={isSensitive}>
          <p
            className="text-[15px] leading-relaxed text-white/90 break-words"
            style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
          >
            {sanitizeConfession(confession.content)}
          </p>
        </SensitiveContentWarning>

        {/* Reactions Section */}
        <div className="pt-1.5" onClick={(e) => e.stopPropagation()}>
          <ReactionPicker confessionId={confession.id} userId={user?.id} />
        </div>

        {/* Bottom Actions: Comments */}
        <div className="flex items-center justify-between pt-1.5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <MessageCircle className="w-4 h-4" />
            <span>{confession.comments_count || 0}</span>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/confession/${confession.id}#comments`);
            }}
            className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors"
            aria-label="View comments"
          >
            <MessageCircle className="w-4 h-4 text-white/70" />
          </button>
        </div>
      </Card>
    </NoScreenshotMode>
  );
};

export default memo(ConfessionCard);
