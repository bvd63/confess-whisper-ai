import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
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
  isHighlighted?: boolean;
}

const HIGHLIGHT_COST = 50;

export function HighlightCommentButton({
  commentId,
  isOwner,
  isHighlighted = false,
}: HighlightCommentButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const highlightMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check balance
      const { data: balance } = await supabase
        .from('user_coins')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (!balance || balance.balance < HIGHLIGHT_COST) {
        throw new Error('Insufficient coins');
      }

      // Deduct coins
      const { error: txError } = await supabase
        .from('coin_transactions')
        .insert({
          user_id: user.id,
          amount: -HIGHLIGHT_COST,
          type: 'purchase',
          description: 'Highlighted comment',
        });

      if (txError) throw txError;

      // Mark comment as highlighted (expires in 24h)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { error: updateError } = await supabase
        .from('comments')
        .update({
          is_highlighted: true,
          highlight_expires_at: expiresAt.toISOString(),
        } as any)
        .eq('id', commentId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-coins'] });
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      toast.success(t.highlight_comment_success_title, {
        description: t.highlight_comment_success_description,
      });
      setIsOpen(false);
    },
    onError: (error: Error) => {
      if (error.message === 'Insufficient coins') {
        toast.error(t.insufficient_coins);
      } else {
        toast.error(t.highlight_comment_error);
      }
    },
  });

  if (!isOwner || isHighlighted) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-1"
      >
        <Sparkles className="h-3 w-3" />
        {t.highlight_comment}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.highlight_comment}</DialogTitle>
            <DialogDescription>
              {t.highlight_comment_description}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-4 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                <Sparkles className="h-5 w-5" />
                <span className="font-semibold">{t.highlight_comment_features}</span>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                <li>• {t.highlight_comment_feature_1}</li>
                <li>• {t.highlight_comment_feature_2}</li>
                <li>• {t.highlight_comment_feature_3}</li>
              </ul>
            </div>

            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                {t.highlight_comment_cost.replace('{cost}', HIGHLIGHT_COST.toString())}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              {t.cancel}
            </Button>
            <Button
              onClick={() => highlightMutation.mutate()}
              disabled={highlightMutation.isPending}
            >
              {highlightMutation.isPending ? t.processing : t.highlight_now}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
