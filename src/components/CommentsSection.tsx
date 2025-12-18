import { useState, useEffect, memo } from "react";
import { useCachePurgeOnDelete } from "@/hooks/useCachePurgeOnDelete";
import { Button } from "@/components/ui/button";
import { MessageSquare, Trash2, Send, Shield, User as UserIcon } from "lucide-react";
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
    loadComments();
  }, [confessionId]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Real-time subscription for new comments
  useEffect(() => {
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
  }, [confessionId]);

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

  const highlightComments: Comment[] = [];
  const regularComments: Comment[] = [];
  comments.forEach(comment => {
    const highlightExpiresAt = comment.highlight_expires_at || null;
    const isHighlightActive = Boolean(
      comment.is_highlighted &&
      highlightExpiresAt &&
      new Date(highlightExpiresAt).getTime() > now
    );
    if (isHighlightActive) {
      highlightComments.push(comment);
    } else {
      regularComments.push(comment);
    }
  });
  const orderedComments = [...highlightComments, ...regularComments];
  const highlightCost = 15;
  const postAsPreview = isAnonymous
    ? t.comments_post_as_preview.replace('{name}', t.user_anonymous)
    : t.comments_post_as_preview.replace('{name}', currentUserProfile?.nickname ? `@${currentUserProfile.nickname}` : t.user_anonymous);

  return (
    <div className="mt-3 space-y-2.5">
      <div className="flex items-center gap-2 text-foreground">
        <MessageSquare className="w-4 h-4" />
        <span className="text-sm font-semibold">{t.comments_title}</span>
        {commentsCount > 0 && <span className="text-xs text-muted-foreground">({commentsCount})</span>}
      </div>

      <div className="space-y-3">
        {orderedComments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {t.comments_empty}
          </p>
        ) : (
          orderedComments.map((comment) => {
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
                  "group relative p-4 sm:p-5 rounded-2xl transition-all duration-300 backdrop-blur-md",
                  isHighlightActive
                    ? "bg-gradient-to-br from-vip-gold/18 via-vip-gold/10 to-transparent border border-vip-gold/30 shadow-[0_12px_28px_rgba(255,215,0,0.18)]"
                    : "bg-white/5 border border-white/10"
                )}
              >
                {isHighlightActive && (
                  <div className="absolute top-3 right-3 text-yellow-300">
                    ⭐
                  </div>
                )}

                {isHighlightActive && (
                  <div className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 bg-vip-gold/18 border border-vip-gold/35 rounded-full shadow-sm">
                    <span className="text-xs font-semibold text-vip-gold">
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

                <p className="text-sm text-white/90 leading-relaxed mb-3 pr-8">
                  {sanitizeComment(comment.content)}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shadow-inner",
                      isAnonymousComment 
                        ? "bg-white/10 text-white" 
                        : "bg-primary/20 text-primary-foreground"
                    )}>
                      {isAnonymousComment ? <Shield className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                    </div>
                    <span className="text-sm font-semibold text-white">
                      {displayName}
                    </span>
                    {!isAnonymousComment && (
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-white/10 text-vip-gold rounded-full border border-vip-gold/35">
                        VIP
                      </span>
                    )}
                    <span className="text-xs text-white/70">
                      · {timeAgo(comment.created_at)}
                    </span>
                  </div>

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
                        className="h-8 w-8 p-0 text-white/70 hover:text-destructive hover:bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {user && (
        <div className="p-3.5 sm:p-5 bg-[#0f0f1a]/85 border border-border/60 backdrop-blur-md rounded-2xl space-y-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-foreground/90">{t.comments_post_as_label}</span>
            <span className="text-[11px] text-muted-foreground line-clamp-1">{postAsPreview}</span>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              type="button"
              size="sm"
              variant={isAnonymous ? "default" : "ghost"}
              className={cn(
                "h-8 px-3 rounded-full text-xs sm:text-sm flex-1",
                isAnonymous
                  ? "bg-primary text-primary-foreground shadow-[0_6px_18px_hsl(var(--primary)/0.35)]"
                  : "text-foreground hover:bg-muted/60"
              )}
              onClick={() => setIsAnonymous(true)}
            >
              <Shield className="w-4 h-4 mr-2" />
              {t.comments_post_as_anonymous}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={!isAnonymous ? "default" : "ghost"}
              className={cn(
                "h-8 px-3 rounded-full text-xs sm:text-sm flex-1",
                !isAnonymous
                  ? "bg-primary text-primary-foreground shadow-[0_6px_18px_hsl(var(--primary)/0.35)]"
                  : "text-foreground hover:bg-muted/60"
              )}
              onClick={() => setIsAnonymous(false)}
            >
              <UserIcon className="w-4 h-4 mr-2" />
              {t.comments_post_as_public.replace('{username}', currentUserProfile?.nickname || t.user_anonymous)}
            </Button>
          </div>

          <div className="flex items-center gap-3">
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
                className="w-full h-11 px-3.5 bg-white/5 border border-white/10 rounded-full text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all shadow-inner"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !newComment.trim() || cooldownSeconds > 0}
              size="icon"
              className="h-11 w-11 rounded-full bg-gradient-to-r from-primary via-primary/90 to-accent text-primary-foreground shadow-[0_10px_26px_hsl(var(--primary)/0.28)] hover:shadow-[0_12px_30px_hsl(var(--primary)/0.32)] disabled:opacity-50 transition-all"
            >
              {isSubmitting ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            {cooldownSeconds > 0 ? (
              <span>{t.comments_error_cooldown} ({cooldownSeconds}s)</span>
            ) : (
              <span className="opacity-0">placeholder</span>
            )}
            <span>{newComment.length}/500</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(CommentsSection);
