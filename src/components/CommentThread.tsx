import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

  const handleReply = async () => {
    if (!currentUserId) {
      toast({
        title: "Autentificare necesară",
        description: "Trebuie să fii autentificat pentru a răspunde",
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
          parent_comment_id: parentCommentId, // Would need to add this column
        });

      if (error) throw error;

      toast({
        title: "Răspuns trimis",
        description: "Răspunsul tău a fost adăugat",
      });

      setReplyContent("");
      setIsReplying(false);
      onReplyAdded();
    } catch (error) {
      console.error('Error posting reply:', error);
      toast({
        title: "Eroare",
        description: "Nu am putut trimite răspunsul",
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
                {new Date(reply.created_at).toLocaleDateString('ro-RO')}
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
          Răspunde
        </Button>
      ) : (
        <div className="space-y-2">
          <Textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Scrie un răspuns..."
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
              Trimite
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
              Anulează
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentThread;