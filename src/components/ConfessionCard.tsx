import { useState, memo } from "react";
import { AnimatedCard } from "@/components/AnimatedCard";
import { EnhancedButton } from "@/components/EnhancedButton";
import { MessageCircle, Sparkles, Crown, Award, Wand2, Rocket, Loader2 } from "lucide-react";
import DeepInsightDialog from "./DeepInsightDialog";
import ShareDialog from "./ShareDialog";
import ReportDialog from "./ReportDialog";
import CommentsSection from "./CommentsSection";
import ConfessionActions from "./ConfessionActions";
import ConfessionHeader from "./ConfessionHeader";
import { OptimizedImage } from "./OptimizedImage";
import ReactionPicker from "./ReactionPicker";
import BadgesDisplay from "./BadgesDisplay";
import FollowButton from "./FollowButton";
import StreakCounter from "./StreakCounter";
import { BadgeDisplay } from "./BadgeDisplay";
import { AwardPicker } from "./coins/AwardPicker";
import { AwardDisplay } from "./coins/AwardDisplay";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { notify } from "@/lib/notifications";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCachePurgeOnDelete } from "@/hooks/useCachePurgeOnDelete";
import { Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditDeleteWindow } from "@/hooks/useEditDeleteWindow";
import { useHaptic } from "@/hooks/useHaptic";
import { useSensitiveContent } from "@/hooks/useSensitiveContent";
import { SensitiveContentWarning } from "./SensitiveContentWarning";
import { NoScreenshotMode } from "./NoScreenshotMode";
import { EmotionalTone } from "./EmotionalTone";
import { VIPBadge } from "./VIPBadge";
import { sanitizeConfession } from "@/lib/security/sanitizer";
import { logError } from "@/lib/logger";
import { useCoins } from "@/hooks/useCoins";

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
  };
  isPremium: boolean;
  isLiked?: boolean;
  isBookmarked?: boolean;
  onReport?: (id: string) => void;
  onUpgradeClick: () => void;
  onInsightGenerated: () => void;
  onLikeChange?: () => void;
  onCommentChange?: () => void;
  onBookmarkChange?: () => void;
}

const ConfessionCard = ({ confession, isPremium, isLiked: initialIsLiked, isBookmarked: initialIsBookmarked, onReport, onUpgradeClick, onInsightGenerated, onLikeChange, onCommentChange, onBookmarkChange }: ConfessionCardProps) => {
  const [isDeepInsightOpen, setIsDeepInsightOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isAwardPickerOpen, setIsAwardPickerOpen] = useState(false);
  const [commentsCount, setCommentsCount] = useState(confession.comments_count || 0);
  const [isBoostLoading, setIsBoostLoading] = useState(false);
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const confirm = useConfirm();
  const { purgeConfession } = useCachePurgeOnDelete();
  const { subscriptionTier } = usePremiumStatus(confession.user_id || null);
  const isOwner = user?.id === confession.user_id;
  const { canDelete, deleteTimeLeft } = useEditDeleteWindow(confession.created_at);
  const { vibrate } = useHaptic();
  const { isSensitive } = useSensitiveContent(confession.content);
  const noScreenshotEnabled = isPremium && isOwner;
  const { balance } = useCoins(user?.id);

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

    const BOOST_COST = 15;
    if (balance < BOOST_COST) {
      toast({
        title: t.insufficient_coins,
        description: `You need ${BOOST_COST} coins to boost this confession.`,
        variant: "destructive",
      });
      return;
    }

    setIsBoostLoading(true);
    try {
      const { error } = await supabase.functions.invoke('boost-confession', {
        body: { confessionId: confession.id },
      });

      if (error) throw error;

      toast({
        title: t.boost_success_title,
        description: t.boost_success_description,
      });
      
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
      <AnimatedCard 
        hover="lift"
        className="p-5 sm:p-6 mb-4 touch-manipulation transition-all duration-300 hover:shadow-xl bg-card border border-border rounded-3xl animate-slide-up"
      >
        <div className="mb-4">
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
        </div>

        <SensitiveContentWarning isSensitive={isSensitive}>
          <p className="text-base leading-relaxed text-foreground mb-4 break-words">
            {sanitizeConfession(confession.content)}
          </p>
        </SensitiveContentWarning>

      {confession.image_url && (
        <div className="mb-5">
          <OptimizedImage
            src={confession.image_url}
            alt={t.ui_confession_image}
            className={`w-full h-auto object-cover max-h-[400px] rounded-2xl ${
              confession.image_blurred ? 'blur-lg' : ''
            }`}
            width={800}
            height={400}
          />
        </div>
      )}

      {confession.emotional_tone && (
        <div className="mb-4">
          <EmotionalTone tone={confession.emotional_tone} size="sm" />
        </div>
      )}

      <div className="mb-4">
        <AwardDisplay confessionId={confession.id} />
      </div>

      <div className="mb-4">
        <ReactionPicker confessionId={confession.id} userId={user?.id} />
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-4">
        <ConfessionActions
          confessionId={confession.id}
          confessionUserId={confession.user_id}
          currentUserId={user?.id || null}
          likesCount={confession.likes_count || 0}
          isLiked={initialIsLiked || false}
          isBookmarked={initialIsBookmarked || false}
          onLikeChange={onLikeChange || (() => {})}
          onBookmarkChange={onBookmarkChange || (() => {})}
          onShare={() => setIsShareOpen(true)}
          onReport={() => setIsReportOpen(true)}
          onDelete={handleDeleteConfession}
        />
        
        {/* Coin-Spending Features */}
        {!isOwner && user && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAwardPickerOpen(true)}
            className="gap-1.5 text-xs h-9 px-3 rounded-xl hover:bg-vip-gold/10 transition-colors"
          >
            <Award className="w-4 h-4 text-vip-gold" />
            <span className="hidden sm:inline font-medium">Award</span>
          </Button>
        )}
        
        {isOwner && (
          <Button
              variant="ghost"
              size="sm"
              onClick={handleBoostConfession}
              disabled={isBoostLoading}
              className="gap-2 h-11 px-5 rounded-[22px] bg-gradient-to-br from-orange-500/15 via-orange-600/10 to-red-500/15 hover:from-orange-500/25 hover:via-orange-600/20 hover:to-red-500/25 border border-orange-400/30 hover:border-orange-400/50 shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 backdrop-blur-sm"
            >
              {isBoostLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-orange-500 drop-shadow-sm" />
              ) : (
                <Rocket className="w-5 h-5 text-orange-500 drop-shadow-sm animate-pulse" />
              )}
              <span className="hidden sm:inline font-semibold text-[15px] bg-gradient-to-r from-orange-600 to-red-600 dark:from-orange-400 dark:to-red-400 bg-clip-text text-transparent drop-shadow-sm">
                {isBoostLoading ? t.processing : t.boost_confession}
              </span>
            </Button>
        )}
      </div>

      {confession.ai_response && (
        <>
          <div className={cn(
            "mt-5 rounded-2xl transition-all",
            subscriptionTier === 'vip' 
              ? "p-5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 shadow-lg shadow-primary/10" 
              : "p-4 bg-muted/60 border border-border"
          )}>
            {subscriptionTier === 'vip' && (
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                </div>
                <span className="text-sm font-bold text-primary uppercase tracking-wide">
                  VIP AI Response
                </span>
              </div>
            )}
            <p className="text-sm leading-relaxed text-foreground-secondary">
              {confession.ai_response}
            </p>
          </div>

          <EnhancedButton
            onClick={() => setIsDeepInsightOpen(true)}
            variant="outline"
            className="w-full mt-4 h-12 rounded-2xl border-primary/20 text-primary hover:bg-primary/5 font-medium"
            glow
            shine
          >
            <Sparkles className="w-5 h-5 mr-2" />
            {confession.ai_deep_insight ? t.deep_insight_title : t.generate_insight}
          </EnhancedButton>
        </>
      )}

      {/* Comments Section */}
      <CommentsSection
        confessionId={confession.id}
        confessionOwnerId={confession.user_id || ''}
        commentsCount={commentsCount}
        onCommentChange={() => {
          setCommentsCount(prev => prev + 1);
          onCommentChange?.();
        }}
      />

      <DeepInsightDialog
        open={isDeepInsightOpen}
        onOpenChange={setIsDeepInsightOpen}
        confession={confession}
        isPremium={isPremium}
        onUpgradeClick={onUpgradeClick}
        onInsightGenerated={onInsightGenerated}
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
      </AnimatedCard>
    </NoScreenshotMode>
  );
};

export default memo(ConfessionCard);
