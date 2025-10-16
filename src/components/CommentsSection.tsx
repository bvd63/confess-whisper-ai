import { useState, useEffect, memo, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Trash2, Send, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";

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

const CommentsSection = memo(({ confessionId, commentsCount, confessionOwnerId, onCommentChange }: CommentsSectionProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { t } = useLanguage();

  const loadComments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('confession_id', confessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  }, [confessionId]);

  useEffect(() => {
    if (isExpanded) {
      loadComments();
    }
  }, [isExpanded, loadComments]);

  const handleSubmit = useCallback(async () => {
    if (!newComment.trim() || !user) return;

    if (newComment.length > 500) {
      toast({
        title: t.error_generic,
        description: "Comment too long (max 500 characters)",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          confession_id: confessionId,
          user_id: user.id,
          content: newComment.trim(),
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
      console.error('Error posting comment:', error);
      toast({
        title: t.error_generic,
        description: t.error_submit,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [newComment, user, confessionId, t, toast, loadComments, onCommentChange]);

  const handleDelete = useCallback(async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      await loadComments();
      onCommentChange?.();
      
      toast({
        title: t.success_deleted,
        description: t.comments_delete,
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: t.error_generic,
        description: t.error_delete,
        variant: "destructive",
      });
    }
  }, [loadComments, onCommentChange, t, toast]);

  const timeAgo = useMemo(() => (date: string) => {
    const now = new Date();
    const commentDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - commentDate.getTime()) / 60000);
    
    if (diffInMinutes < 1) return 'acum';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}z`;
  }, []);

  return (
    <div className="mt-4 border-t border-border/50 pt-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-between text-muted-foreground hover:text-foreground"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          <span className="text-sm">
            {commentsCount} {t.comments_title}
          </span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </Button>

      {isExpanded && (
        <div className="mt-4 space-y-4 animate-fade-in">
          {/* Add Comment Form */}
          {user && (
            <div className="space-y-2">
              <Textarea
                placeholder={t.comments_placeholder}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px] resize-none border-primary/20 focus:border-primary/40 bg-background/50"
                disabled={isSubmitting}
                maxLength={500}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {newComment.length}/500
                </span>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !newComment.trim()}
                  size="sm"
                  className="bg-gradient-to-r from-primary to-primary/80"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {t.comments_submit}
                </Button>
              </div>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-3">
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t.comments_none}
              </p>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-3 bg-muted/30 rounded-lg border border-border/50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Anonim</span>
                      <span>•</span>
                      <span>{timeAgo(comment.created_at)}</span>
                    </div>
                    {(user?.id === comment.user_id || user?.id === confessionOwnerId) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(comment.id)}
                        className="h-6 px-2 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-foreground">{comment.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
});

CommentsSection.displayName = "CommentsSection";

export default CommentsSection;