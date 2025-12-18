import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface HighlightCommentButtonProps {
  commentId: string;
  isOwner: boolean;
  highlightExpiresAt?: string | null;
  onHighlightActivated?: (expiresAt: string) => void;
}

const HIGHLIGHT_COST = 15;
const HIGHLIGHT_DURATION_HOURS = 4;

const getRemainingMs = (expiresAt?: string | null) => {
  if (!expiresAt) return 0;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return diff > 0 ? diff : 0;
};

const formatTimeLeft = (ms: number) => {
  if (ms <= 0) return '0m';
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  return `${minutes}m`;
};

export function HighlightCommentButton({
  commentId,
  isOwner,
  highlightExpiresAt = null,
  onHighlightActivated,
}: HighlightCommentButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeUntil, setActiveUntil] = useState<string | null>(highlightExpiresAt);
  const [remainingMs, setRemainingMs] = useState(() => getRemainingMs(highlightExpiresAt));
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const isActive = remainingMs > 0;
  const formattedTimeLeft = formatTimeLeft(remainingMs);

  useEffect(() => {
    setActiveUntil(highlightExpiresAt);
  }, [highlightExpiresAt]);

  useEffect(() => {
    if (!activeUntil) {
      setRemainingMs(0);
      return;
    }

    const update = () => setRemainingMs(getRemainingMs(activeUntil));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeUntil]);

  const highlightMutation = useMutation<string, Error, void>({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: balance } = await supabase
        .from('user_coins')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (!balance || balance.balance < HIGHLIGHT_COST) {
        throw new Error('Insufficient coins');
      }

      const { data: deductResult, error: deductError } = await supabase
        .rpc('deduct_coins', {
          _user_id: user.id,
          _amount: HIGHLIGHT_COST,
          _type: 'highlight_comment',
          _description: 'Highlighted comment',
          _reference_id: commentId,
        });

      if (deductError) throw deductError;
      if (!deductResult) throw new Error('Failed to deduct coins');

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + HIGHLIGHT_DURATION_HOURS);
      const expiresIso = expiresAt.toISOString();

      const { data: updatedComment, error: updateError } = await supabase
        .from('comments')
        .update({
          is_highlighted: true,
          highlight_expires_at: expiresIso,
        } as any)
        .eq('id', commentId)
        .select('highlight_expires_at')
        .single();

      if (updateError) throw updateError;
      return updatedComment?.highlight_expires_at ?? expiresIso;
    },
    onSuccess: (expiresAt) => {
      queryClient.invalidateQueries({ queryKey: ['user-coins'] });
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      toast.success(t.highlight_comment_success_title, {
        description: t.highlight_comment_success_description,
      });
      setActiveUntil(expiresAt);
      onHighlightActivated?.(expiresAt);
    },
    onError: (error: Error) => {
      if (error.message === 'Insufficient coins') {
        toast.error(t.insufficient_coins);
      } else {
        toast.error(t.highlight_comment_error);
      }
    },
  });

  if (!isOwner) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        data-highlight-btn={commentId}
        className="gap-2 h-8 px-3 rounded-lg hover:bg-vip-gold/10"
      >
        <span className="text-sm">⭐</span>
        <span className="text-[11px] font-semibold text-foreground/80">
          {isActive
            ? formattedTimeLeft
            : t.highlight_comment_cta.replace('{cost}', HIGHLIGHT_COST.toString())}
        </span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.highlight_comment}</DialogTitle>
            <DialogDescription>
              {t.highlight_comment_description}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {isActive && (
              <div className="flex items-center gap-3 rounded-xl bg-yellow-100/70 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 px-3 py-2">
                <span className="text-2xl">⭐</span>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
                    {t.highlight_comment_active_badge}
                  </p>
                  <p className="text-xs text-yellow-800/90 dark:text-yellow-200/80">
                    {t.highlight_comment_time_left.replace('{time}', formattedTimeLeft)}
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-4 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                <span className="text-xl">⭐</span>
                <span className="font-semibold">{t.highlight_comment_features}</span>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                <li>• {t.highlight_comment_feature_1}</li>
                <li>• {t.highlight_comment_feature_2}</li>
                <li>• {t.highlight_comment_feature_3}</li>
              </ul>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {t.highlight_comment_cost.replace('{cost}', HIGHLIGHT_COST.toString())}
              </p>
              {!isActive && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t.highlight_comment_success_description}
                </p>
              )}
            </div>

            {isActive && (
              <p className="text-xs text-muted-foreground text-center">
                {t.highlight_comment_active_note.replace('{time}', formattedTimeLeft)}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              {t.cancel}
            </Button>
            <Button
              onClick={() => highlightMutation.mutate()}
              disabled={isActive || highlightMutation.isPending}
            >
              {isActive
                ? t.highlight_comment_active_badge
                : highlightMutation.isPending
                  ? t.processing
                  : t.highlight_now}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
