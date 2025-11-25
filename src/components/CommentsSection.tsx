import { useState, useEffect, memo } from "react";
import { useCachePurgeOnDelete } from "@/hooks/useCachePurgeOnDelete";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Trash2, Send, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useConfirm } from "@/contexts/ConfirmContext";
import { notify } from "@/lib/notifications";
import { SubscriptionBadge } from "@/components/SubscriptionBadge";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { CommentAuthor } from "./CommentAuthor";
import { sanitizeComment } from "@/lib/security/sanitizer";
import { addCsrfHeader } from "@/lib/security/csrf";
import { logError } from "@/lib/logger";
import { HighlightCommentButton } from "./coins/HighlightCommentButton";
import { cn } from "@/lib/utils";

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
}

interface CommentsSectionProps {
  confessionId: string;
  commentsCount: number;
  confessionOwnerId: string;
  onCommentChange?: () => void;
}

const CommentsSection = ({ confessionId, commentsCount, confessionOwnerId, onCommentChange }: CommentsSectionProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const confirm = useConfirm();
  const { purgeComment } = useCachePurgeOnDelete();

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('confession_id', confessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      logError('Error loading comments', error instanceof Error ? error : undefined);
    }
  };

  useEffect(() => {
    if (isExpanded) {
      loadComments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded, confessionId]);

  const handleSubmit = async () => {
    if (!newComment.trim() || !user) return;

    if (newComment.length > 500) {
      toast({
        title: t.error_generic,
        description: t.comments_too_long_error,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Sanitize comment content before submission
      const sanitizedContent = sanitizeComment(newComment.trim());
      
      const { error } = await supabase
        .from('comments')
        .insert({
          confession_id: confessionId,
          user_id: user.id,
          content: sanitizedContent,
        });

      if (error) throw error;

      setNewComment("");
      await loadComments();
      onCommentChange?.();
      
      toast({
        title: t.success_sent,
        description: t.comments_submit,
      });
    } catch (error) {
      logError('Error posting comment', error instanceof Error ? error : undefined);
      toast({
        title: t.error_generic,
        description: t.error_submit,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    const confirmed = await confirm({
      titleKey: 'confirm.deleteComment.title',
      messageKey: 'confirm.deleteComment.message',
      variant: 'danger',
    });
    
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      // Purge cache immediately
      purgeComment(commentId, confessionId);

      await loadComments();
      onCommentChange?.();
      
      notify.success('notifications.commentDeleted', language);
    } catch (error) {
      logError('Error deleting comment', error instanceof Error ? error : undefined);
      toast({
        title: t.error_generic,
        description: t.error_delete,
        variant: "destructive",
      });
    }
  };

  const timeAgo = (date: string) => {
    const now = new Date();
    const commentDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - commentDate.getTime()) / 60000);
    
    if (diffInMinutes < 1) return t.time_now;
    if (diffInMinutes < 60) return `${diffInMinutes}${t.time_minutes}`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}${t.time_hours}`;
    return `${Math.floor(diffInMinutes / 1440)}${t.time_days}`;
  };

  return (
    <div className="mt-3 sm:mt-4 border-t border-border/50 pt-3 sm:pt-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-between text-muted-foreground hover:text-foreground px-2 sm:px-4 min-h-[48px]"
      >
        <div className="flex items-center gap-1.5 sm:gap-2">
          <MessageSquare className="w-4 h-4 sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm">
            {commentsCount} {t.comments_title}
          </span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4 sm:w-4 sm:h-4" /> : <ChevronDown className="w-4 h-4 sm:w-4 sm:h-4" />}
      </Button>

      {isExpanded && (
        <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4 animate-fade-in">
          {/* Add Comment Form */}
          {user && (
            <div className="space-y-2">
              <Textarea
                placeholder={t.comments_placeholder}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[60px] sm:min-h-[80px] resize-none border-primary/20 focus:border-primary/40 bg-background/50 text-xs sm:text-sm"
                disabled={isSubmitting}
                maxLength={500}
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs text-muted-foreground">
                  {newComment.length}/500
                </span>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !newComment.trim()}
                  size="sm"
                  className="bg-gradient-to-r from-primary to-primary/80 text-xs sm:text-sm"
                >
                  <Send className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  {t.comments_submit}
                </Button>
              </div>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-2 sm:space-y-3">
            {comments.length === 0 ? (
              <p className="text-xs sm:text-sm text-muted-foreground text-center py-3 sm:py-4">
                {t.comments_none}
              </p>
            ) : (
              comments.map((comment) => {
                const isHighlighted = (comment as any).is_highlighted;
                const isCommentOwner = user?.id === comment.user_id;
                
                return (
                  <div
                    key={comment.id}
                    className={cn(
                      "p-2 sm:p-3 rounded-lg border",
                      isHighlighted
                        ? "bg-vip-gold/10 border-vip-gold/30 shadow-md"
                        : "bg-muted/30 border-border/50"
                    )}
                  >
                    <div className="flex items-start justify-between mb-1 sm:mb-2">
                      <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
                        <CommentAuthor userId={comment.user_id} showBadge={true} />
                        <span>•</span>
                        <span>{timeAgo(comment.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {isCommentOwner && (
                          <HighlightCommentButton
                            commentId={comment.id}
                            isOwner={isCommentOwner}
                            isHighlighted={isHighlighted}
                          />
                        )}
                        {(user?.id === comment.user_id || user?.id === confessionOwnerId) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(comment.id)}
                            className="min-h-[44px] min-w-[44px] px-2 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-foreground leading-relaxed">{sanitizeComment(comment.content)}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(CommentsSection);