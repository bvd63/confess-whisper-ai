import { useState, useEffect, memo } from "react";
import { MessageCircle, Share2, Copy, Flag, Award, Loader2, Trash2 } from "lucide-react";
import ShareDialog from "./ShareDialog";
import ReportDialog from "./ReportDialog";
import CommentsSection from "./CommentsSection";
import ConfessionHeader from "./ConfessionHeader";
import { OptimizedImage } from "./OptimizedImage";
import ReactionPicker from "./ReactionPicker";
import { AwardPicker } from "./coins/AwardPicker";
import { AwardDisplay } from "./coins/AwardDisplay";
import { useVipStatus } from "@/hooks/usePremiumStatus";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { notify } from "@/lib/notifications";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCachePurgeOnDelete } from "@/hooks/useCachePurgeOnDelete";
import { cn } from "@/lib/utils";
import { useEditDeleteWindow } from "@/hooks/useEditDeleteWindow";
import { useHaptic } from "@/hooks/useHaptic";
import { useSensitiveContent } from "@/hooks/useSensitiveContent";
import { SensitiveContentWarning } from "./SensitiveContentWarning";
import { NoScreenshotMode } from "./NoScreenshotMode";
import { EmotionalTone } from "./EmotionalTone";
import { sanitizeConfession } from "@/lib/security/sanitizer";
import { logError } from "@/lib/logger";
import { useCoins } from "@/hooks/useCoins";
import { addTwentyFourHours, getBoostStatus } from "@/lib/boosts";

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

const ConfessionCard = ({
  confession,
  isVip,
  isLiked: _initialIsLiked,
  isBookmarked: _initialIsBookmarked,
  onReport,
  onUpgradeClick: _onUpgradeClick,
  onInsightGenerated: _onInsightGenerated,
  onLikeChange,
  onCommentChange,
  onBookmarkChange: _onBookmarkChange,
}: ConfessionCardProps) => {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isAwardPickerOpen, setIsAwardPickerOpen] = useState(false);
  const [commentsCount, setCommentsCount] = useState(confession.comments_count || 0);
  const [isBoostLoading, setIsBoostLoading] = useState(false);
  const [boostEndsAt, setBoostEndsAt] = useState<string | null>(confession.boost_expires_at ?? null);
  const [boostStatus, setBoostStatus] = useState(() => getBoostStatus(confession.boost_expires_at ?? null));
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const confirm = useConfirm();
  const { purgeConfession } = useCachePurgeOnDelete();
  const { subscriptionTier } = useVipStatus(confession.user_id || null);
  const isOwner = user?.id === confession.user_id;
  const { canDelete, deleteTimeLeft } = useEditDeleteWindow(confession.created_at);
  const { vibrate } = useHaptic();
  const { isSensitive } = useSensitiveContent(confession.content);
  const noScreenshotEnabled = isVip && isOwner;
  const { balance } = useCoins(user?.id);

  useEffect(() => {
    setBoostEndsAt(confession.boost_expires_at ?? null);
  }, [confession.boost_expires_at, confession.id]);

  useEffect(() => {
    const updateStatus = () => {
      const status = getBoostStatus(boostEndsAt);
      setBoostStatus(status);

      if (boostEndsAt && !status.isBoosted) {
        setBoostEndsAt(null);
      }
    };

    updateStatus();

    if (!boostEndsAt) {
      return;
    }

    const interval = setInterval(updateStatus, 60 * 1000);
    return () => clearInterval(interval);
  }, [boostEndsAt]);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(confession.content);
      vibrate('light');
      toast({
        title: t.text_copied,
        duration: 2000,
      });
    } catch (error) {
      logError('Failed to copy text', error instanceof Error ? error : undefined);
    }
  };

  const handleDeleteConfession = async () => {
    if (!user || confession.user_id !== user.id) return;

    const confirmed = await confirm({
      titleKey: 'confirm.deleteConfession.title',
      messageKey: 'confirm.deleteConfession.message',
      variant: 'danger',
    });
    
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('confessions')
        .delete()
        .eq('id', confession.id);

      if (error) throw error;

      // Immediately purge cache
      purgeConfession(confession.id);

      notify.success('notifications.confessionDeleted', language);

      // Refresh the page or notify parent component
      onLikeChange?.();
    } catch (error) {
      logError('Error deleting confession', error instanceof Error ? error : undefined);
      toast({
        title: t.error_generic,
        description: t.error_delete,
        variant: "destructive",
      });
    }
  };

  const handleBoostConfession = async () => {
    if (!user || !isOwner) return;

    // Block if already boosted
    if (boostStatus.isBoosted) {
      toast({
        title: t.coins_boost_already_active,
        variant: "destructive",
      });
      return;
    }

    const BOOST_COST = 25;
    if (balance < BOOST_COST) {
      toast({
        title: t.boost_not_enough,
        description: t.boost_cost.replace('{cost}', BOOST_COST.toString()),
        variant: "destructive",
      });
      return;
    }

    const confirmed = await confirm({
      titleKey: 'confirm.boostConfession.title',
      messageKey: 'confirm.boostConfession.message',
      variant: 'default',
    });
    
    if (!confirmed) return;

    setIsBoostLoading(true);
    try {
      const { data: boostResponse, error } = await supabase.functions.invoke('boost-confession', {
        body: { confessionId: confession.id },
      });

      // Handle backend response for active boost
      if (boostResponse?.error === 'BOOST_ALREADY_ACTIVE') {
        toast({
          title: t.coins_boost_already_active,
          variant: "destructive",
        });
        setIsBoostLoading(false);
        return;
      }

      if (error) throw error;

      toast({
        title: t.boost_success_title,
        description: t.boost_success_description,
      });

      const endsAtFromResponse = boostResponse?.boost?.endsAt ?? addTwentyFourHours();
      setBoostEndsAt(endsAtFromResponse);
      setBoostStatus(getBoostStatus(endsAtFromResponse));

      onLikeChange?.(); // Refresh to show boosted status
    } catch (error) {
      logError('Error boosting confession', error instanceof Error ? error : undefined);
      toast({
        title: t.error_generic,
        description: 'Failed to boost confession. Please try again.',
        variant: "destructive",
      });
    } finally {
      setIsBoostLoading(false);
    }
  };

  return (
    <NoScreenshotMode enabled={noScreenshotEnabled}>
      <div className="relative mb-6 overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-[#1B1F3A] via-[#0A0B17] to-[#05060F] p-5 sm:p-8 text-white shadow-[0_25px_60px_rgba(5,6,15,0.45)]">
        <div className="pointer-events-none absolute inset-0 opacity-50" aria-hidden="true">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_55%)]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/40 to-transparent" />
        </div>

        <div className="relative z-10 space-y-6">
          {boostStatus.isBoosted && (
            <div className="flex items-center gap-1.5 self-end rounded-full border border-orange-400/40 bg-orange-500/15 px-3 py-1.5 text-xs font-semibold text-orange-200">
              <span className="text-base">🚀</span>
              <span>
                {t.boosted.badge.label} · {boostStatus.lessThanHour
                  ? t.boosted.badge.lessThanHour
                  : t.boosted.badge.left.replace('{{hours}}', String(boostStatus.hoursLeft))}
              </span>
            </div>
          )}

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
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

                <div className="flex items-center gap-1.5">
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsReportOpen(true)}
                    className="h-10 w-10 rounded-full border border-white/15 bg-white/5 text-white/80 hover:bg-white/15"
                    aria-label={t.report}
                  >
                    <Flag className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <SensitiveContentWarning isSensitive={isSensitive}>
                <p className="text-base leading-relaxed text-white/85 sm:text-lg">
                  {sanitizeConfession(confession.content)}
                </p>
              </SensitiveContentWarning>

              {confession.image_url && (
                <OptimizedImage
                  src={confession.image_url}
                  alt={t.ui_confession_image}
                  className={cn(
                    "w-full max-h-[420px] rounded-[28px] object-cover",
                    confession.image_blurred && "blur-lg"
                  )}
                  width={960}
                  height={540}
                />
              )}

              {confession.emotional_tone && (
                <EmotionalTone tone={confession.emotional_tone} size="sm" />
              )}

              <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
                <AwardDisplay confessionId={confession.id} />
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 text-white/70">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                    {t.stats_empathetic_reactions}
                  </span>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <MessageCircle className="h-4 w-4" />
                    <span>
                      {commentsCount} {t.comments_title}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <ReactionPicker confessionId={confession.id} userId={user?.id} />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {!isOwner && user && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAwardPickerOpen(true)}
                  className="h-11 rounded-full border border-amber-200/40 bg-white/5 px-4 text-sm font-semibold text-amber-100 backdrop-blur"
                >
                  <Award className="mr-2 h-4 w-4" />
                  {t.coins_award_give}
                </Button>
              )}

              {isOwner && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBoostConfession}
                  disabled={isBoostLoading || boostStatus.isBoosted}
                  className="h-11 rounded-full border border-orange-300/30 bg-gradient-to-r from-orange-500/70 to-pink-500/70 px-4 text-sm font-semibold text-white shadow-lg shadow-orange-900/30 disabled:opacity-60"
                >
                  {isBoostLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <span className="mr-2">🚀</span>
                  )}
                  {boostStatus.isBoosted ? t.boost_active : t.boost_cta}
                </Button>
              )}

              {isOwner && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteConfession}
                  disabled={!canDelete}
                  className="h-11 rounded-full border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white/80 hover:text-destructive disabled:cursor-not-allowed"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {canDelete ? t.delete : `${t.delete} · ${Math.max(0, Math.floor(deleteTimeLeft / 60))}m`}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <CommentsSection
        confessionId={confession.id}
        confessionOwnerId={confession.user_id || ''}
        commentsCount={commentsCount}
        onCommentChange={() => {
          setCommentsCount((prev) => prev + 1);
          onCommentChange?.();
        }}
      />

      <ShareDialog
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        confessionId={confession.id}
      />

      <ReportDialog
        open={isReportOpen}
        onOpenChange={setIsReportOpen}
        confessionId={confession.id}
        userId={user?.id || null}
      />

      <AwardPicker
        open={isAwardPickerOpen}
        onOpenChange={setIsAwardPickerOpen}
        confessionId={confession.id}
      />
    </NoScreenshotMode>
  );
};

export default memo(ConfessionCard);
