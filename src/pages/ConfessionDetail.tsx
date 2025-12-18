import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Crown, Shield, User as UserIcon, Zap, Clock3, ArrowLeft, MoreVertical, Trash2 } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useLanguage } from "@/contexts/LanguageContext";
import { useVipStatus } from "@/hooks/usePremiumStatus";
import { useSensitiveContent } from "@/hooks/useSensitiveContent";
import { useConfirm } from "@/contexts/ConfirmContext";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeConfession } from "@/lib/security/sanitizer";
import { getBoostStatus } from "@/lib/boosts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SensitiveContentWarning } from "@/components/SensitiveContentWarning";
import { NoScreenshotMode } from "@/components/NoScreenshotMode";
import AppLayout from "@/components/AppLayout";
import CommentsSection from "@/components/CommentsSection";
import ReactionPicker from "@/components/ReactionPicker";
import { BoostConfessionButton } from "@/components/coins/BoostConfessionButton";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { logError } from "@/lib/logger";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Confession {
  id: string;
  content: string;
  category: string;
  user_id?: string | null;
  likes_count?: number;
  comments_count?: number;
  created_at: string;
  is_anonymous?: boolean;
  author_display_name_snapshot?: string | null;
  author_nickname_snapshot?: string | null;
  boost_expires_at?: string | null;
}

const ConfessionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const confirm = useConfirm();
  const { user } = useCurrentUser();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [confession, setConfession] = useState<Confession | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentsCount, setCommentsCount] = useState(0);
  const [boostExpiresAt, setBoostExpiresAt] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const { subscriptionTier } = useVipStatus(confession?.user_id || null);
  const { isSensitive } = useSensitiveContent(confession?.content || '');

  const noScreenshotEnabled = subscriptionTier === 'vip' && user?.id === confession?.user_id;

  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }

    const loadConfession = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('confessions')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        if (!data) {
          toast({
            title: t.error_generic,
            description: "Confession not found",
            variant: "destructive",
          });
          navigate('/');
          return;
        }

        setConfession(data);
        setCommentsCount(data.comments_count || 0);

        // Load boost status from confession_boosts table
        const { data: boostData } = await supabase
          .from('confession_boosts')
          .select('ends_at')
          .eq('confession_id', id)
          .eq('status', 'ACTIVE')
          .maybeSingle();
        
        setBoostExpiresAt(boostData?.ends_at || null);

        // Check if user has liked this confession
        if (user) {
          const { data: likeData } = await supabase
            .from('user_likes')
            .select('id')
            .eq('user_id', user.id)
            .eq('confession_id', id)
            .maybeSingle();

          setIsLiked(!!likeData);

          // Check if user has bookmarked this confession
          const { data: bookmarkData } = await supabase
            .from('bookmarks')
            .select('id')
            .eq('user_id', user.id)
            .eq('confession_id', id)
            .maybeSingle();

          setIsBookmarked(!!bookmarkData);
        }
      } catch (error) {
        logError('Error loading confession', error as Error);
        toast({
          title: t.error_generic,
          description: t.error_generic,
          variant: "destructive",
        });
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    loadConfession();
  }, [id, user, navigate, t, toast]);

  const displayName = useMemo(() => {
    if (!confession) return '';
    if (confession.is_anonymous !== undefined) {
      return confession.is_anonymous
        ? t.confession_author_anonymous
        : `@${confession.author_display_name_snapshot || confession.author_nickname_snapshot || t.user_anonymous}`;
    }
    return confession.author_display_name_snapshot || confession.author_nickname_snapshot || t.user_anonymous;
  }, [confession, t]);

  const timeAgo = useMemo(() => {
    if (!confession) return '';
    const now = new Date();
    const confessionDate = new Date(confession.created_at);
    const diffInMinutes = Math.floor((now.getTime() - confessionDate.getTime()) / 60000);
    if (diffInMinutes < 1) return t.time_now;
    if (diffInMinutes < 60) return `${diffInMinutes}${t.time_minutes}`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}${t.time_hours}`;
    return `${Math.floor(diffInMinutes / 1440)}${t.time_days}`;
  }, [confession, t]);

  const visibilityLabel = t.profile_privacy_public || 'Public';
  const AvatarIcon = confession?.is_anonymous ? Shield : UserIcon;
  const { isBoosted, hoursLeft, lessThanHour } = useMemo(() => getBoostStatus(boostExpiresAt), [boostExpiresAt]);
  const boostTimeLabel = useMemo(() => {
    if (!isBoosted) return null;
    return lessThanHour ? '<1h' : `${hoursLeft}h`;
  }, [isBoosted, hoursLeft, lessThanHour]);

  const reloadLikes = async () => {
    if (!user || !id) return;
    const { data } = await supabase
      .from('user_likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('confession_id', id)
      .maybeSingle();
    setIsLiked(!!data);
  };

  const reloadBookmarks = async () => {
    if (!user || !id) return;
    const { data } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', user.id)
      .eq('confession_id', id)
      .maybeSingle();
    setIsBookmarked(!!data);
  };

  const handleDeleteConfession = async () => {
    if (!confession || !user) return;

    const confirmed = await confirm({
      titleKey: 'confirm.deleteConfession.title',
      messageKey: 'confirm.deleteConfession.message',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('confessions')
        .delete()
        .eq('id', confession.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: t.success_deleted,
      });

      // Navigate based on where the user came from
      const from = (location.state as any)?.from;
      if (from === 'profile_my_confessions') {
        navigate('/profile', { state: { tab: 'my_confessions' } });
      } else {
        navigate('/');
      }
    } catch (error) {
      logError('Error deleting confession', error as Error);
      toast({
        title: t.error_delete,
        variant: "destructive",
      });
    }
  };

  const handleBackClick = () => {
    const from = (location.state as any)?.from;
    if (from === 'profile_my_confessions') {
      navigate('/profile', { state: { tab: 'my_confessions' } });
    } else {
      navigate(-1);
    }
  };

  if (loading) {
    return (
      <AppLayout onNewConfession={() => {}} onManageSubscription={() => {}}>
        <main className="mx-auto w-full max-w-[560px] px-4 sm:px-6 py-6 pb-24">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackClick}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t.common_back || 'Back'}
          </Button>
          <Skeleton className="h-96 w-full rounded-3xl" />
        </main>
      </AppLayout>
    );
  }

  if (!confession) {
    return null;
  }

  return (
    <AppLayout onNewConfession={() => {}} onManageSubscription={() => {}}>
      <NoScreenshotMode enabled={noScreenshotEnabled}>
        <main className="mx-auto w-full max-w-[560px] px-4 sm:px-6 py-6 pb-24">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackClick}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t.common_back || 'Back'}
          </Button>

          <Card className="w-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#2a2e5c] via-[#19192f] to-[#0d0d1b] p-5 sm:p-6 space-y-5 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-primary/70 via-primary/60 to-accent/70 flex items-center justify-center shadow-lg shadow-primary/30">
                <AvatarIcon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white truncate">{displayName}</span>
                  {subscriptionTier === 'vip' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-[11px] uppercase tracking-wide flex-shrink-0">
                      <Crown className="w-3.5 h-3.5 text-vip-gold" />
                      VIP
                    </span>
                  )}
                  {isBoosted && (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400/90 via-amber-500 to-orange-500 text-[12px] font-semibold text-black shadow-lg border border-amber-200/70 flex-shrink-0">
                      <Zap className="w-4 h-4" />
                      <span>{t.boost_badge}</span>
                      {boostTimeLabel && (
                        <span className="inline-flex items-center text-[11px] font-medium text-black/80 flex-shrink-0">
                          <Clock3 className="w-3.5 h-3.5 mr-1" />
                          {t.boost_expiry_in?.replace('{time}', boostTimeLabel)}
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-white/70">
                  <span>{timeAgo}</span>
                  <span>·</span>
                  <span>{visibilityLabel}</span>
                </div>
              </div>
              {user?.id === confession.user_id && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/70 hover:text-white">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#1a1a2e] border-white/10">
                    <DropdownMenuItem
                      onClick={handleDeleteConfession}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t.delete || 'Delete'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <SensitiveContentWarning isSensitive={isSensitive}>
              <p className="text-base leading-relaxed text-white/90 break-words">
                {sanitizeConfession(confession.content)}
              </p>
            </SensitiveContentWarning>

            <div className="rounded-2xl border border-white/8 bg-white/5 p-3 shadow-inner">
              <ReactionPicker confessionId={confession.id} userId={user?.id} />
            </div>

            <div className="flex justify-center">
              <BoostConfessionButton
                confessionId={confession.id}
                isOwner={user?.id === confession.user_id}
                boostExpiresAt={boostExpiresAt}
                onBoostActivated={(expiresAt) => setBoostExpiresAt(expiresAt)}
              />
            </div>

            <CommentsSection
              confessionId={confession.id}
              confessionOwnerId={confession.user_id || ''}
              commentsCount={commentsCount}
              onCommentChange={() => {
                setCommentsCount(prev => prev + 1);
              }}
            />
          </Card>
        </main>
      </NoScreenshotMode>
    </AppLayout>
  );
};

export default ConfessionDetail;
