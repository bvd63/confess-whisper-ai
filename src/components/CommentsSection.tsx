import { useState, useEffect, memo, useMemo } from "react";
import { useCachePurgeOnDelete } from "@/hooks/useCachePurgeOnDelete";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Trash2, Send, Star, Sparkles } from "lucide-react";
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
  const isConfessionOwner = user?.id === confessionOwnerId;
  const highlightCost = 15;

  const isHighlightActive = (comment: Comment) => {
    if (!comment.is_highlighted || !comment.highlight_expires_at) return false;
    return new Date(comment.highlight_expires_at).getTime() > now;
  };

  const orderedComments = useMemo(() => {
    return [...comments].sort((a, b) => {
      const aHighlight = isHighlightActive(a);
      const bHighlight = isHighlightActive(b);
      if (aHighlight && !bHighlight) return -1;
      if (!aHighlight && bHighlight) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [comments, now]);

  const activeHighlights = orderedComments.filter(isHighlightActive);
  const primaryHighlight = activeHighlights[0];

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

  return (
    <section className="mt-10 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
            {t.comments_live_label}
          </p>
          <div className="mt-2 flex items-center gap-2 text-foreground">
            <MessageSquare className="h-5 w-5 text-primary" />
            <span className="text-xl font-semibold">
              {(commentsCount || orderedComments.length)} {t.comments_title}
            </span>
          </div>
        </div>
        <span className="text-sm text-muted-foreground">{t.comments_add}</span>
      </div>

      <div
        className={cn(
          "rounded-[28px] border p-5 shadow-inner",
          primaryHighlight
            ? "border-amber-300/60 bg-gradient-to-br from-amber-500/10 via-transparent to-background"
            : "border-border/60 bg-muted/20"
        )}
      >
        {primaryHighlight ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-500">
                <Star className="h-4 w-4" />
                <span className="text-sm font-semibold tracking-wide">
                  {t.highlight_comment_active_badge}
                </span>
              </div>
              <ExpiryTimer
                expiresAt={primaryHighlight.highlight_expires_at || undefined}
                showIcon={false}
                className="text-xs font-semibold text-amber-600"
              />
            </div>
            <p className="text-base font-medium leading-relaxed text-foreground">
              {sanitizeComment(primaryHighlight.content)}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {primaryHighlight.is_anonymous !== false
                  ? (primaryHighlight.alias || 'Anonymous')
                  : `@${primaryHighlight.profiles?.nickname || 'User'}`}
              </span>
              <span>•</span>
              <span>{timeAgo(primaryHighlight.created_at)}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-2xl">
              ⭐
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {t.comments_highlight_empty}
              </p>
              <p className="text-sm">
                {t.highlight_comment_description}
              </p>
              <p className="text-xs text-muted-foreground">
                {t.highlight_comment_cost.replace('{cost}', highlightCost.toString())}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {orderedComments.length === 0 ? (
          <p className="rounded-[24px] border border-dashed border-border/60 bg-muted/20 py-6 text-center text-sm text-muted-foreground">
            {t.comments_empty}
          </p>
        ) : (
          orderedComments.map((comment) => {
            const highlightExpiresAt = comment.highlight_expires_at || null;
            const highlightActive = isHighlightActive(comment);
            const canDelete = user?.id === comment.user_id || isConfessionOwner;
            const displayName = comment.is_anonymous !== false
              ? (comment.alias || 'Anonymous')
              : `@${comment.profiles?.nickname || 'User'}`;

            return (
              <div
                key={comment.id}
                className={cn(
                  "rounded-[24px] border p-4",
                  highlightActive
                    ? "border-amber-300/70 bg-amber-500/5 shadow-lg shadow-amber-900/15"
                    : "border-border/60 bg-background/60"
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{displayName}</span>
                      <span>•</span>
                      <span>{timeAgo(comment.created_at)}</span>
                      {highlightActive && (
                        <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
                          <Star className="h-3 w-3" />
                          <ExpiryTimer
                            expiresAt={highlightExpiresAt || undefined}
                            className="text-[11px]"
                            showIcon={false}
                          />
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-foreground">
                      {sanitizeComment(comment.content)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {isConfessionOwner && (
                      <HighlightCommentButton
                        commentId={comment.id}
                        isOwner={isConfessionOwner}
                        highlightExpiresAt={highlightExpiresAt}
                        onHighlightActivated={(expiresAt) => {
                          setComments((prev) => prev.map((existing) =>
                            existing.id === comment.id
                              ? { ...existing, is_highlighted: true, highlight_expires_at: expiresAt }
                              : existing
                          ));
                        }}
                      />
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(comment.id)}
                        className="h-9 rounded-full border border-border/60 px-3 text-xs text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        {t.delete}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-background/95 via-background/90 to-background/80 p-5 shadow-lg shadow-black/5">
        {user ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-foreground">{t.comments_add}</span>
              <span className="text-muted-foreground">{newComment.length}/500</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium uppercase tracking-[0.2em]">{t.comments_post_as_label}</span>
              <div className="flex flex-1 rounded-full border border-border/60 bg-background/70 p-1">
                <button
                  type="button"
                  onClick={() => setIsAnonymous(true)}
                  className={cn(
                    "flex-1 rounded-full px-3 py-2 font-semibold transition",
                    isAnonymous ? "bg-primary/10 text-primary" : "text-muted-foreground"
                  )}
                >
                  {t.comments_post_as_anonymous}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAnonymous(false)}
                  className={cn(
                    "flex-1 rounded-full px-3 py-2 font-semibold transition",
                    !isAnonymous ? "bg-primary/10 text-primary" : "text-muted-foreground"
                  )}
                >
                  {t.comments_post_as_public.replace('{username}', currentUserProfile?.nickname || 'User')}
                </button>
              </div>
            </div>
            <Textarea
              placeholder={t.comments_placeholder}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[120px] resize-none rounded-2xl border border-border/60 bg-background/80 text-base text-foreground"
              disabled={isSubmitting}
              maxLength={500}
            />
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>
                {t.confession_anonymous_preview.replace(
                  '{name}',
                  isAnonymous ? t.user_anonymous : `@${currentUserProfile?.nickname || 'User'}`
                )}
              </span>
              {cooldownSeconds > 0 && (
                <span className="font-semibold text-amber-600">
                  {t.comments_error_cooldown} ({cooldownSeconds}s)
                </span>
              )}
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !newComment.trim() || cooldownSeconds > 0}
                className="ml-auto gap-2 rounded-full bg-gradient-to-r from-primary to-primary/80 px-6 text-sm font-semibold text-primary-foreground"
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin">⏳</span>
                    {t.comments_submit}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {t.comments_submit}
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="text-base font-semibold text-foreground">{t.login}</p>
            <p className="text-sm">{t.error_auth}</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default memo(CommentsSection);
