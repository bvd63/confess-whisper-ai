import { useState, memo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
}

interface CommentThreadProps {
  parentCommentId: string;
  confessionId: string;
  currentUserId: string | null;
  replies: Comment[];
  onReplyAdded: () => void;
}

const CommentThread = ({ 
  parentCommentId, 
  confessionId, 
  currentUserId, 
  replies,
  onReplyAdded 
}: CommentThreadProps) => {
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { t, language } = useLanguage();

  const handleReply = async () => {
    if (!currentUserId) {
      toast({
        title: t.auth_error,
        description: t.auth_error_generic,
        variant: "destructive",
      });
      return;
    }

    if (!replyContent.trim()) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          content: replyContent.trim(),
          confession_id: confessionId,
          user_id: currentUserId,
          parent_comment_id: parentCommentId,
        });

      if (error) throw error;

      toast({
        title: t.success_sent,
        description: t.comments_reply_added_desc,
      });

      setReplyContent("");
      setIsReplying(false);
      onReplyAdded();
    } catch (error) {
      console.error('Error posting reply:', error);
      toast({
        title: t.common_error,
        description: t.comment_reply_error,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ml-8 mt-2 space-y-2">
      {replies.length > 0 && (
        <div className="space-y-2 border-l-2 border-primary/20 pl-4">
          {replies.map((reply) => (
            <div key={reply.id} className="text-sm">
              <p className="text-muted-foreground">{reply.content}</p>
              <span className="text-xs text-muted-foreground">
                {new Date(reply.created_at).toLocaleDateString(
                  language === 'es' ? 'es-ES' : language === 'de' ? 'de-DE' : 'en-US'
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {!isReplying ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsReplying(true)}
          className="text-xs gap-1"
        >
          <MessageCircle className="w-3 h-3" />
          {t.comments_reply_button}
        </Button>
      ) : (
        <div className="space-y-2">
          <Textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder={t.comments_reply_placeholder}
            className="min-h-[60px] text-sm"
            disabled={isSubmitting}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleReply}
              disabled={isSubmitting || !replyContent.trim()}
            >
              <Send className="w-3 h-3 mr-1" />
              {t.comments_send_button}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsReplying(false);
                setReplyContent("");
              }}
              disabled={isSubmitting}
            >
              {t.moderation_cancel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(CommentThread);