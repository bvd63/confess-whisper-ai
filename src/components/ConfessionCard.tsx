import { useState, memo } from "react";
import { AnimatedCard } from "@/components/AnimatedCard";
import { EnhancedButton } from "@/components/EnhancedButton";
import { MessageCircle, Sparkles, Crown } from "lucide-react";
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
import { BoostConfessionButton } from "./BoostConfessionButton";
import { AwardPicker } from "./coins/AwardPicker";
import { AwardDisplay } from "./coins/AwardDisplay";
import { BoostDialog } from "./coins/BoostDialog";
import { AIMakeoverDialog } from "./coins/AIMakeoverDialog";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useBoostStatus } from "@/hooks/useBoostStatus";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
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
  const [isBoostDialogOpen, setIsBoostDialogOpen] = useState(false);
  const [isAIMakeoverOpen, setIsAIMakeoverOpen] = useState(false);
  const [isBackgroundDialogOpen, setIsBackgroundDialogOpen] = useState(false);
  const [commentsCount, setCommentsCount] = useState(confession.comments_count || 0);
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { purgeConfession } = useCachePurgeOnDelete();
  const { subscriptionTier } = usePremiumStatus(confession.user_id || null);
  const { boostStatus, refetch: refetchBoost } = useBoostStatus(confession.id);
  const isOwner = user?.id === confession.user_id;
  const { canDelete, deleteTimeLeft } = useEditDeleteWindow(confession.created_at);
  const { vibrate } = useHaptic();
  const { isSensitive } = useSensitiveContent(confession.content);
  const noScreenshotEnabled = isPremium && isOwner;

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(confession.content);
      vibrate('light');
      toast({
        title: t.text_copied,
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const handleDeleteConfession = async () => {
    if (!user || confession.user_id !== user.id) return;

    try {
      const { error } = await supabase
        .from('confessions')
        .delete()
        .eq('id', confession.id);

      if (error) throw error;

      // Immediately purge cache
      purgeConfession(confession.id);

      toast({
        title: t.success_deleted,
        description: t.confession_deleted,
      });

      // Refresh the page or notify parent component
      onLikeChange?.();
    } catch (error) {
      console.error('Error deleting confession:', error);
      toast({
        title: t.error_generic,
        description: t.error_delete,
        variant: "destructive",
      });
    }
  };

  return (
    <NoScreenshotMode enabled={noScreenshotEnabled}>
      <AnimatedCard 
        hover="lift"
        glass
        className="p-3 sm:p-4 md:p-5 mb-3 sm:mb-4 touch-manipulation transition-smooth hover:shadow-lg animate-slide-up"
      >
        <div className="mb-2 sm:mb-3 flex items-center gap-2">
          <ConfessionHeader 
            category={confession.category} 
            createdAt={confession.created_at}
            authorNicknameSnapshot={confession.author_nickname_snapshot}
            authorVisibilitySnapshot={confession.author_visibility_snapshot}
            isBoosted={boostStatus.isActive}
            isAnonymous={confession.is_anonymous}
            authorDisplayName={confession.author_display_name_snapshot}
          />
          <VIPBadge tier={subscriptionTier as 'free' | 'vip'} size="sm" />
        </div>

        <SensitiveContentWarning isSensitive={isSensitive}>
          <p className="text-sm sm:text-base text-foreground leading-relaxed mb-3 sm:mb-4 break-words">
            {sanitizeConfession(confession.content)}
          </p>
        </SensitiveContentWarning>

      {/* Display image if available */}
      {confession.image_url && (
        <div className="mb-3 sm:mb-4">
          <OptimizedImage
            src={confession.image_url}
            alt={t.ui_confession_image}
            className={`w-full h-auto object-cover max-h-[300px] sm:max-h-[400px] rounded-lg ${
              confession.image_blurred ? 'blur-lg' : ''
            }`}
            width={800}
            height={400}
          />
        </div>
      )}

      {/* Emotional Tone */}
      {confession.emotional_tone && (
        <div className="mb-3">
          <EmotionalTone tone={confession.emotional_tone} size="sm" />
        </div>
      )}

      {/* Show user badges and streak if available */}
      {confession.user_id && (
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <BadgesDisplay userId={confession.user_id} variant="compact" />
          <StreakCounter userId={confession.user_id} variant="compact" />
          <div className="ml-auto">
            <FollowButton 
              targetUserId={confession.user_id} 
              currentUserId={user?.id || null}
            />
          </div>
        </div>
      )}

      {/* Awards Display */}
      <div className="mb-3">
        <AwardDisplay confessionId={confession.id} />
      </div>

      {/* Reactions */}
      <div className="mb-3">
        <ReactionPicker confessionId={confession.id} userId={user?.id} />
      </div>

      {/* Copy Text Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopyText}
        className="text-xs gap-1"
      >
        <Copy className="h-3 w-3" />
        <span className="hidden sm:inline">{t.copy_text}</span>
      </Button>

      {/* Interaction Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {user && isOwner && canDelete && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBoostDialogOpen(true)}
              className="text-xs"
            >
              ⚡ Boost
            </Button>
            <AIMakeoverDialog
              confessionId={confession.id}
              originalContent={confession.content}
              isOwner={isOwner}
            />
          </>
        )}
        {user && isOwner && canDelete && deleteTimeLeft > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            {t.delete_available?.replace('{time}', Math.ceil(deleteTimeLeft / 60).toString() + 'm')}
          </span>
        )}
        {user && !isOwner && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAwardPickerOpen(true)}
            className="text-xs"
          >
            🏆 Give Award
          </Button>
        )}
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
      </div>

      {confession.ai_response && (
        <>
          <div className={cn(
            "mt-4 rounded-lg transition-all",
            subscriptionTier === 'vip' 
              ? "p-4 bg-gradient-to-r from-purple-500/10 to-purple-600/10 border border-purple-500/30 shadow-lg shadow-purple-500/10" 
              : "p-3 bg-muted/50"
          )}>
            {subscriptionTier === 'vip' && (
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                  <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                    VIP Priority AI Response
                  </span>
                </div>
                <div className="ml-auto text-xs text-purple-400/80">
                  2x Karma Active
                </div>
              </div>
            )}
            <p className={cn(
              "text-sm leading-relaxed",
              subscriptionTier === 'vip' && "text-purple-100"
            )}>
              {confession.ai_response}
            </p>
          </div>

          {/* Deep Insight Button */}
          <EnhancedButton
            onClick={() => setIsDeepInsightOpen(true)}
            variant="outline"
            className="w-full mt-3 border-primary/30 text-primary"
            glow
            shine
          >
            <Sparkles className="w-4 h-4 mr-2 animate-pulse-glow" />
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

      <BoostDialog
        open={isBoostDialogOpen}
        onOpenChange={setIsBoostDialogOpen}
        confessionId={confession.id}
        onBoostSuccess={() => {
          refetchBoost();
          setIsBoostDialogOpen(false);
        }}
      />
      </AnimatedCard>
    </NoScreenshotMode>
  );
};

export default memo(ConfessionCard);
