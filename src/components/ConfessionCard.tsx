import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { MessageCircle, Sparkles } from "lucide-react";
import DeepInsightDialog from "./DeepInsightDialog";
import ShareDialog from "./ShareDialog";
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
  const [commentsCount, setCommentsCount] = useState(confession.comments_count || 0);
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleDeleteConfession = async () => {
    if (!user || confession.user_id !== user.id) return;

    try {
      const { error } = await supabase
        .from('confessions')
        .delete()
        .eq('id', confession.id);

      if (error) throw error;

      toast({
        title: t.success_deleted,
        description: "Confesiunea a fost ștearsă",
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
    <Card className="p-5 mb-4 bg-gradient-to-br from-card to-muted/30 border-border/50 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-glow)] transition-all duration-300 animate-fade-in">
      <div className="mb-3">
        <ConfessionHeader 
          category={confession.category} 
          createdAt={confession.created_at}
        />
      </div>

      <p className="text-foreground leading-relaxed mb-4">
        {confession.content}
      </p>

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
        onReport={onReport}
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
          <Button
            onClick={() => setIsDeepInsightOpen(true)}
            variant="outline"
            className="w-full mt-3 border-primary/30 hover:bg-primary/10 hover:border-primary/50 text-primary"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {confession.ai_deep_insight ? t.deep_insight_title : t.generate_insight}
          </Button>
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
    </Card>
  );
};

export default ConfessionCard;
