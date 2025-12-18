import { memo, useMemo, useState } from "react";
import { MessageCircle, Share2, Award, Flag, Copy, Crown } from "lucide-react";
import ConfessionHeader from "./ConfessionHeader";
import ReactionPicker from "./ReactionPicker";
import ShareDialog from "./ShareDialog";
import ReportDialog from "./ReportDialog";
import { AwardPicker } from "./coins/AwardPicker";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useVipStatus } from "@/hooks/usePremiumStatus";
import { sanitizeConfession } from "@/lib/security/sanitizer";
import { Button } from "@/components/ui/button";
import { useHaptic } from "@/hooks/useHaptic";
import { getBoostStatus } from "@/lib/boosts";
import { formatDistanceToNow } from "date-fns";
import { useSensitiveContent } from "@/hooks/useSensitiveContent";
import { SensitiveContentWarning } from "./SensitiveContentWarning";

interface HomeFeedCardProps {
  confession: {
    id: string;
    content: string;
    category: string;
    user_id?: string | null;
    comments_count?: number;
    likes_count?: number;
    created_at: string;
    author_nickname_snapshot?: string | null;
    author_visibility_snapshot?: string | null;
    author_display_name_snapshot?: string | null;
    is_anonymous?: boolean;
    emotional_tone?: string | null;
    boost_expires_at?: string | null;
  };
  currentUserId?: string | null;
}

export const HomeFeedCard = memo(({ confession, currentUserId }: HomeFeedCardProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { vibrate } = useHaptic();
  const { subscriptionTier } = useVipStatus(confession.user_id || null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isAwardPickerOpen, setIsAwardPickerOpen] = useState(false);

  const isOwner = confession.user_id && currentUserId === confession.user_id;
  const canGiveAward = Boolean(currentUserId) && !isOwner;
  const commentsCount = confession.comments_count || 0;
  const boostStatus = useMemo(() => getBoostStatus(confession.boost_expires_at ?? null), [confession.boost_expires_at]);
  const { isSensitive } = useSensitiveContent(confession.content);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(confession.content);
      vibrate('light');
      toast({
        title: t.text_copied,
        duration: 2000,
      });
    } catch {
      toast({
        title: t.common_error,
        description: t.error_generic,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <article className="relative overflow-hidden rounded-[32px] border border-white/12 bg-gradient-to-br from-[#1c1343] via-[#0b0d1f] to-[#05060f] p-5 sm:p-7 text-white shadow-[0_25px_60px_rgba(5,6,15,0.45)]">
        <div className="pointer-events-none absolute inset-0 opacity-60" aria-hidden="true">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_58%)]" />
          <div className="absolute inset-x-4 bottom-0 h-32 rounded-full blur-3xl bg-primary/40" />
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <ConfessionHeader
              category={confession.category}
              createdAt={confession.created_at}
              authorNicknameSnapshot={confession.author_nickname_snapshot}
              authorVisibilitySnapshot={confession.author_visibility_snapshot}
              isAnonymous={confession.is_anonymous}
              authorDisplayName={confession.author_display_name_snapshot}
              userId={confession.user_id}
              subscriptionTier={subscriptionTier}
            />

            <div className="flex items-center gap-2">
              {subscriptionTier === 'vip' && (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-vip-gold">
                  <Crown className="h-3.5 w-3.5" />
                  VIP
                </span>
              )}
              <span className="text-xs text-white/70">
                {formatDistanceToNow(new Date(confession.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>

          {boostStatus.isBoosted && (
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/40 bg-orange-500/20 px-3 py-1 text-xs font-semibold text-orange-100">
              🚀
              {boostStatus.lessThanHour
                ? t.boosted.badge.lessThanHour
                : t.boosted.badge.left.replace('{{hours}}', String(boostStatus.hoursLeft))}
            </div>
          )}

          <SensitiveContentWarning isSensitive={isSensitive}>
            <p className="text-base leading-relaxed text-white/90 sm:text-lg">
              {sanitizeConfession(confession.content)}
            </p>
          </SensitiveContentWarning>

          <ReactionPicker confessionId={confession.id} userId={currentUserId || undefined} variant="feed" />

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white/70">
              <MessageCircle className="h-4 w-4 text-primary" />
              <span>
                {commentsCount} {t.comments_title}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {canGiveAward && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAwardPickerOpen(true)}
                  className="h-10 rounded-full border border-amber-200/40 bg-white/10 px-4 text-xs font-semibold text-amber-100 hover:bg-white/20"
                >
                  <Award className="mr-2 h-4 w-4" />
                  {t.coins_award_give}
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyText}
                className="h-10 w-10 rounded-full border border-white/15 bg-white/5 text-white/80 hover:bg-white/15"
                aria-label={t.share_copy_link}
              >
                <Copy className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsShareOpen(true)}
                className="h-10 w-10 rounded-full border border-white/15 bg-white/5 text-white/80 hover:bg-white/15"
                aria-label={t.share_title}
              >
                <Share2 className="h-4 w-4" />
              </Button>

              {!isOwner && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsReportOpen(true)}
                  className="h-10 w-10 rounded-full border border-white/15 bg-white/5 text-white/80 hover:bg-white/15"
                  aria-label={t.report}
                >
                  <Flag className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </article>

      <ShareDialog open={isShareOpen} onOpenChange={setIsShareOpen} confessionId={confession.id} />
      <ReportDialog open={isReportOpen} onOpenChange={setIsReportOpen} confessionId={confession.id} userId={currentUserId || null} />
      <AwardPicker open={isAwardPickerOpen} onOpenChange={setIsAwardPickerOpen} confessionId={confession.id} />
    </>
  );
});

HomeFeedCard.displayName = "HomeFeedCard";

export default HomeFeedCard;
