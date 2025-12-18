import { useState, useEffect, memo } from "react";
import { useCachePurgeOnDelete } from "@/hooks/useCachePurgeOnDelete";
import { Button } from "@/components/ui/button";
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
  const [now, setNow] = useState(() => Date.now());
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
      
      const rawComments = data || [];

      // Generate aliases, profile data, and normalize highlight state
      const commentsWithData = await Promise.all(
        rawComments.map(async (comment): Promise<Comment> => {
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

          if (comment.highlight_expires_at) {
            const expiresAt = new Date(comment.highlight_expires_at).getTime();
            commentWithData.is_highlighted = Boolean(comment.is_highlighted && expiresAt > Date.now());
          }

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

      commentsWithData.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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

  useEffect(() => {
    if (!isExpanded) return;
    const interval = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(interval);
  }, [isExpanded]);

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

          if (newComment.highlight_expires_at) {
            const expiresAt = new Date(newComment.highlight_expires_at).getTime();
            newComment.is_highlighted = Boolean(newComment.is_highlighted && expiresAt > Date.now());
          }
          
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
    <div className="mt-4 border-t border-border/30 pt-4">
      {/* Comments Header */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-between text-foreground hover:bg-muted/30 px-3 min-h-[48px] rounded-xl"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          <span className="text-sm font-semibold">
            {t.comments_title}
          </span>
          {commentsCount > 0 && (
            <span className="text-xs text-muted-foreground">({commentsCount})</span>
          )}
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </Button>

      {isExpanded && (
        <div className="mt-4 space-y-4 animate-fade-in">
          {/* Comments List */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {t.comments_empty}
              </p>
            ) : (
              comments.map((comment) => {
                const highlightExpiresAt = comment.highlight_expires_at || null;
                const isHighlightActive = Boolean(
                  comment.is_highlighted &&
                  highlightExpiresAt &&
                  new Date(highlightExpiresAt).getTime() > now
                );
                const isCommentOwner = user?.id === comment.user_id;
                const isAnonymousComment = comment.is_anonymous !== false;
                
                const displayName = isAnonymousComment 
                  ? (comment.alias || 'Anonymous')
                  : `@${comment.profiles?.nickname || 'User'}`;
                
                return (
                  <div
                    key={comment.id}
                    className={cn(
                      "relative p-4 rounded-2xl transition-all duration-300",
                      isHighlightActive
                        ? "bg-gradient-to-br from-vip-gold/15 via-vip-gold/10 to-transparent border border-vip-gold/30 shadow-lg shadow-vip-gold/10"
                        : "bg-muted/40 backdrop-blur-sm border border-border/30"
                    )}
                  >
                    {/* Highlight Star Badge - Top Right */}
                    {isHighlightActive && (
                      <div className="absolute top-3 right-3">
                        <span className="text-xl">⭐</span>
                      </div>
                    )}

                    {/* Highlight Badge - Top of Card */}
                    {isHighlightActive && (
                      <div className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 bg-vip-gold/20 border border-vip-gold/40 rounded-full">
                        <span className="text-xs font-medium text-vip-gold">
                          {t.highlight_comment_active_badge}
                        </span>
                        <span className="text-xs text-vip-gold/80">·</span>
                        <ExpiryTimer 
                          expiresAt={highlightExpiresAt || undefined}
                          className="text-xs text-vip-gold"
                          showIcon={false}
                        />
                      </div>
                    )}

                    {/* Comment Content */}
                    <p className="text-sm text-foreground leading-relaxed mb-3 pr-8">
                      {sanitizeComment(comment.content)}
                    </p>

                    {/* Comment Footer */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {/* Avatar Indicator */}
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                          isAnonymousComment 
                            ? "bg-primary/20 text-primary" 
                            : "bg-neon-blue/20 text-neon-blue"
                        )}>
                          {isAnonymousComment ? '👤' : displayName.charAt(1).toUpperCase()}
                        </div>
                        <span className={cn(
                          "text-xs font-medium",
                          isAnonymousComment ? "text-foreground/80" : "text-primary"
                        )}>
                          {displayName}
                        </span>
                        {/* VIP Badge for public comments - check if user has VIP */}
                        {!isAnonymousComment && (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-vip-gold/20 text-vip-gold rounded">
                            VIP
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          · {timeAgo(comment.created_at)}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {isCommentOwner && (
                          <HighlightCommentButton
                            commentId={comment.id}
                            isOwner={isCommentOwner}
                            highlightExpiresAt={highlightExpiresAt}
                            onHighlightActivated={(expiresAt) => {
                              setComments(prev => prev.map(existing =>
                                existing.id === comment.id
                                  ? { ...existing, is_highlighted: true, highlight_expires_at: expiresAt }
                                  : existing
                              ));
                            }}
                          />
                        )}
                        {(user?.id === comment.user_id || user?.id === confessionOwnerId) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(comment.id)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive rounded-full"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Highlight action available via star button in Actions row above */}
                  </div>
                );
              })
            )}
          </div>

          {/* Comment Composer - Bottom Fixed Style */}
          {user && (
            <div className="mt-4 p-4 bg-muted/30 backdrop-blur-sm border border-border/30 rounded-2xl">
              <div className="flex items-center gap-3">
                {/* Input Field */}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder={t.comments_anonymous_placeholder}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !isSubmitting && newComment.trim()) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                    disabled={isSubmitting}
                    maxLength={500}
                    className="w-full h-12 px-4 bg-background/60 border border-border/40 rounded-xl text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                  />
                </div>

                {/* Anonymous/Username Toggle - matches reference */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap leading-tight text-right">
                    {t.comments_post_as_anonymous}<br />/ Username
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAnonymous(!isAnonymous)}
                    className={cn(
                      "relative w-10 h-6 rounded-full transition-colors duration-200",
                      isAnonymous ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm",
                        isAnonymous ? "left-5" : "left-1"
                      )}
                    />
                  </button>
                </div>

                {/* Send Button */}
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !newComment.trim() || cooldownSeconds > 0}
                  size="icon"
                  className="h-12 w-12 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>

              {/* Character count */}
              <div className="flex justify-end mt-2">
                <span className="text-[10px] text-muted-foreground">
                  {newComment.length}/500
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default memo(CommentsSection);
