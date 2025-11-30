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
import { sanitizeComment } from "@/lib/security/sanitizer";
import { logError } from "@/lib/logger";
import { HighlightCommentButton } from "./coins/HighlightCommentButton";
import { ExpiryTimer } from "@/components/ExpiryTimer";
import { cn } from "@/lib/utils";

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  is_highlighted?: boolean;
  highlight_expires_at?: string | null;
  alias?: string | null;
  is_anonymous?: boolean;
  profiles?: {
    nickname?: string | null;
    avatar_url?: string | null;
  };
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
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState<{ nickname?: string | null } | null>(null);
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

      if (error) {
        logError('Error loading comments', error);
        throw error;
      }
      
      // Generate aliases and fetch profile data
      const commentsWithData = await Promise.all(
        (data || []).map(async (comment): Promise<Comment> => {
          const commentWithData: Comment = {
            id: comment.id,
            content: comment.content,
            user_id: comment.user_id,
            created_at: comment.created_at,
            is_highlighted: comment.is_highlighted,
            highlight_expires_at: comment.highlight_expires_at,
            alias: comment.alias,
            is_anonymous: comment.is_anonymous,
          };

          // Generate alias for anonymous comments
          if (comment.is_anonymous !== false && !comment.alias && comment.user_id) {
            const { data: aliasData } = await supabase
              .rpc('generate_comment_alias', {
                p_user_id: comment.user_id,
                p_confession_id: confessionId
              });
            commentWithData.alias = aliasData || 'Anonymous';
          }
          
          // Fetch profile data for public comments
          if (comment.is_anonymous === false && comment.user_id) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('nickname, avatar_url')
              .eq('user_id', comment.user_id)
              .maybeSingle();
            
            if (profileData) {
              commentWithData.profiles = profileData;
            }
          }
          
          return commentWithData;
        })
      );
      
      setComments(commentsWithData);
    } catch (error) {
      logError('Error loading comments', error instanceof Error ? error : undefined);
      toast({
        title: t.error_generic,
        description: t.error_generic,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (isExpanded) {
      loadComments();
    }
  }, [isExpanded, confessionId]);

  // Real-time subscription for new comments
  useEffect(() => {
    if (!isExpanded) return;

    const channel = supabase
      .channel(`comments:${confessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `confession_id=eq.${confessionId}`,
        },
        async (payload) => {
          const newComment = payload.new as Comment;
          
          // Generate alias if anonymous and not already set
          if (newComment.is_anonymous !== false && !newComment.alias && newComment.user_id) {
            const { data: aliasData } = await supabase
              .rpc('generate_comment_alias', {
                p_user_id: newComment.user_id,
                p_confession_id: confessionId
              });
            newComment.alias = aliasData || 'Anonymous';
          }
          
          // Fetch profile data for public comments
          if (newComment.is_anonymous === false && newComment.user_id) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('nickname, avatar_url')
              .eq('user_id', newComment.user_id)
              .maybeSingle();
            
            if (profileData) {
              newComment.profiles = profileData;
            }
          }
          
          setComments(prev => {
            // Avoid duplicates
            if (prev.some(c => c.id === newComment.id)) return prev;
            return [newComment, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isExpanded, confessionId]);

  // Load current user profile for public comment display
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setCurrentUserProfile(data);
    };
    
    loadUserProfile();
  }, [user]);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => {
        setCooldownSeconds(cooldownSeconds - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  const checkAntiSpamRules = async (): Promise<{ allowed: boolean; error?: string }> => {
    if (!user) return { allowed: false, error: t.error_auth };

    try {
      // Check daily limit
      const { data: dailyCheck } = await supabase
        .rpc('check_daily_comment_limit', { p_user_id: user.id });
      
      const dailyResult = dailyCheck as { can_comment: boolean; comments_today: number; daily_limit: number; remaining: number } | null;
      if (dailyResult && !dailyResult.can_comment) {
        return { allowed: false, error: t.comments_error_daily_limit };
      }

      // Check consecutive limit per confession
      const { data: consecutiveCheck } = await supabase
        .rpc('check_consecutive_comment_limit', {
          p_user_id: user.id,
          p_confession_id: confessionId
        });
      
      const consecutiveResult = consecutiveCheck as { can_comment: boolean; reason: string } | null;
      if (consecutiveResult && !consecutiveResult.can_comment) {
        return { allowed: false, error: t.comments_error_consecutive_limit };
      }

      // Check cooldown
      const { data: cooldownCheck } = await supabase
        .rpc('check_comment_cooldown', { p_user_id: user.id });
      
      const cooldownResult = cooldownCheck as { can_comment: boolean; seconds_remaining: number } | null;
      if (cooldownResult && !cooldownResult.can_comment) {
        setCooldownSeconds(cooldownResult.seconds_remaining || 10);
        return { allowed: false, error: t.comments_error_cooldown };
      }

      return { allowed: true };
    } catch (error) {
      logError('Error checking anti-spam rules', error instanceof Error ? error : undefined);
      return { allowed: false, error: t.error_generic };
    }
  };

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

    // Check anti-spam rules
    const spamCheck = await checkAntiSpamRules();
    if (!spamCheck.allowed) {
      toast({
        title: t.error_generic,
        description: spamCheck.error || t.error_generic,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Sanitize comment content before submission
      const sanitizedContent = sanitizeComment(newComment.trim());
      
      // Generate stable alias for this user on this confession
      const { data: aliasData } = await supabase
        .rpc('generate_comment_alias', {
          p_user_id: user.id,
          p_confession_id: confessionId
        });
      
      const alias = aliasData || 'Anonymous';
      
      const { data: insertedComment, error } = await supabase
        .from('comments')
        .insert({
          confession_id: confessionId,
          user_id: user.id,
          content: sanitizedContent,
          alias: isAnonymous ? alias : null,
          is_anonymous: isAnonymous,
        })
        .select()
        .maybeSingle();

      if (error) {
        logError('Error inserting comment', error);
        throw error;
      }

      // Optimistic update - add comment immediately to UI
      if (insertedComment) {
        const optimisticComment: Comment = {
          ...insertedComment,
          alias: isAnonymous ? alias : null,
          profiles: !isAnonymous && currentUserProfile ? currentUserProfile : undefined,
        };
        
        setComments(prev => [optimisticComment, ...prev]);
      }

      // Clear input and reset state
      setNewComment("");
      setCooldownSeconds(10); // Start cooldown internally
      onCommentChange?.();
      
      toast({
        title: t.success_sent,
        description: t.comments_submit,
      });
    } catch (error) {
      logError('Error posting comment', error instanceof Error ? error : undefined);
      
      // Check if it's a specific error we can handle better
      const errorMessage = error instanceof Error ? error.message : String(error);
      
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
                placeholder={t.comments_anonymous_placeholder}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[60px] sm:min-h-[80px] resize-none border-primary/20 focus:border-primary/40 bg-background/50 text-xs sm:text-sm"
                disabled={isSubmitting || cooldownSeconds > 0}
                maxLength={500}
              />
              
              {/* Visibility Selector */}
              <div className="flex items-center gap-2 px-1">
                <span className="text-[10px] sm:text-xs text-muted-foreground">
                  {t.comments_post_as_label}:
                </span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant={isAnonymous ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsAnonymous(true)}
                    className="h-7 px-2 sm:px-3 text-[10px] sm:text-xs"
                  >
                    {t.comments_post_as_anonymous}
                  </Button>
                  <Button
                    type="button"
                    variant={!isAnonymous ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsAnonymous(false)}
                    className="h-7 px-2 sm:px-3 text-[10px] sm:text-xs"
                  >
                    {t.comments_post_as_public.replace('{username}', currentUserProfile?.nickname || 'User')}
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs text-muted-foreground">
                  {newComment.length}/500
                </span>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !newComment.trim() || cooldownSeconds > 0}
                  size="sm"
                  className="bg-gradient-to-r from-primary to-primary/80 text-xs sm:text-sm"
                >
                  {isSubmitting ? (
                    <>
                      <span className="inline-block animate-spin mr-1 sm:mr-2">⏳</span>
                      {t.comments_submit}
                    </>
                  ) : (
                    <>
                      <Send className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      {t.comments_submit}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-2 sm:space-y-3">
            {comments.length === 0 ? (
              <p className="text-xs sm:text-sm text-muted-foreground text-center py-3 sm:py-4">
                {t.comments_empty}
              </p>
            ) : (
              comments.map((comment) => {
                const isHighlighted = comment.is_highlighted;
                const isCommentOwner = user?.id === comment.user_id;
                const isAnonymousComment = comment.is_anonymous !== false; // Default to true for backward compatibility
                
                // Display name logic
                const displayName = isAnonymousComment 
                  ? (comment.alias || 'Anonymous')
                  : `@${comment.profiles?.nickname || 'User'}`;
                
                // Check if highlight is currently active
                const isHighlightActive = isHighlighted && comment.highlight_expires_at && new Date(comment.highlight_expires_at) > new Date();
                
                return (
                  <div
                    key={comment.id}
                    className={cn(
                      "p-2 sm:p-3 rounded-lg border",
                      isHighlightActive
                        ? "bg-vip-gold/10 border-vip-gold/30 shadow-md"
                        : "bg-muted/30 border-border/50"
                    )}
                  >
                    <div className="flex items-start justify-between mb-1 sm:mb-2">
                      <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
                        <span className={cn(
                          "font-medium",
                          isAnonymousComment ? "text-foreground/80" : "text-primary"
                        )}>
                          {displayName}
                        </span>
                        <span>•</span>
                        <span>{timeAgo(comment.created_at)}</span>
                        {/* Highlight Timer Badge - Inline */}
                        {isHighlightActive && (
                          <div className="flex items-center gap-1 bg-vip-gold/20 border border-vip-gold/40 rounded-full px-2 py-0.5 ml-1">
                            <span className="text-xs">⭐</span>
                            <ExpiryTimer 
                              expiresAt={comment.highlight_expires_at} 
                              className="text-[10px] sm:text-xs"
                              showIcon={false}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {isCommentOwner && (
                          <HighlightCommentButton
                            commentId={comment.id}
                            isOwner={isCommentOwner}
                            isHighlighted={isHighlighted}
                            highlightExpiresAt={comment.highlight_expires_at}
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
