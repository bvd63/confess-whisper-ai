import { useState, useMemo } from "react";
import { AnimatedCard } from "@/components/AnimatedCard";
import { EnhancedButton } from "@/components/EnhancedButton";
import { MessageCircle, Sparkles } from "lucide-react";
import DeepInsightDialog from "./DeepInsightDialog";
import ShareDialog from "./ShareDialog";
import ReportDialog from "./ReportDialog";
import CommentsSection from "./CommentsSection";
import ConfessionActions from "./ConfessionActions";
import ConfessionHeader from "./ConfessionHeader";
import ReactionPicker from "./ReactionPicker";
import BadgesDisplay from "./BadgesDisplay";
import FollowButton from "./FollowButton";
import StreakCounter from "./StreakCounter";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCachePurgeOnDelete } from "@/hooks/useCachePurgeOnDelete";

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
  const [commentsCount, setCommentsCount] = useState(confession.comments_count || 0);
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { purgeConfession } = useCachePurgeOnDelete();

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
    <AnimatedCard 
      hover="lift"
      glass
      className="p-3 sm:p-4 md:p-5 mb-3 sm:mb-4 touch-manipulation"
    >
      <div className="mb-2 sm:mb-3">
        <ConfessionHeader 
          category={confession.category} 
          createdAt={confession.created_at}
        />
      </div>

      <p className="text-sm sm:text-base text-foreground leading-relaxed mb-3 sm:mb-4 break-words">
        {confession.content}
      </p>

      {/* Display image if available */}
      {confession.image_url && (
        <div className="mb-3 sm:mb-4 rounded-lg overflow-hidden">
          <img
            src={confession.image_url}
            alt={t.ui_confession_image}
            className={`w-full h-auto object-cover max-h-[300px] sm:max-h-[400px] ${
              confession.image_blurred ? 'blur-lg' : ''
            }`}
          />
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

      {/* Reactions */}
      <div className="mb-3">
        <ReactionPicker confessionId={confession.id} userId={user?.id} />
      </div>

      {/* Interaction Buttons */}
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

      {confession.ai_response && (
        <>
          <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
            <div className="flex items-center gap-2 mb-2 text-primary text-sm font-medium">
              <MessageCircle className="w-4 h-4" />
              <span>{t.ai_reply_title}</span>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed italic">
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
    </AnimatedCard>
  );
};

export default ConfessionCard;
