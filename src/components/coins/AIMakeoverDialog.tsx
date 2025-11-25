import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Wand2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';

interface AIMakeoverDialogProps {
  confessionId: string;
  originalContent: string;
  isOwner: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAKEOVER_COST = 100;

export function AIMakeoverDialog({
  open,
  onOpenChange,
  confessionId,
  originalContent,
  isOwner,
}: AIMakeoverDialogProps) {
  const [makeoverContent, setMakeoverContent] = useState('');
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const makeoverMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check balance
      const { data: balance } = await supabase
        .from('user_coins')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (!balance || balance.balance < MAKEOVER_COST) {
        throw new Error('Insufficient coins');
      }

      // Call polish-confession Edge Function
      const { data, error } = await supabase.functions.invoke('polish-confession', {
        body: { confessionText: originalContent },
      });

      if (error) throw error;
      if (!data?.polishedText) throw new Error('No improved content received');

      setMakeoverContent(data.polishedText);

      // Deduct coins
      const { error: txError } = await supabase
        .from('coin_transactions')
        .insert({
          user_id: user.id,
          amount: -MAKEOVER_COST,
          type: 'purchase',
          description: 'AI Makeover for confession',
        });

      if (txError) throw txError;

      return data.polishedText;
    },
    onError: (error: Error) => {
      if (error.message === 'Insufficient coins') {
        toast.error(t.insufficient_coins);
      } else {
        toast.error(t.ai_makeover_error);
      }
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (newContent: string) => {
      const { error } = await supabase
        .from('confessions')
        .update({ content: newContent })
        .eq('id', confessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['confessions'] });
      queryClient.invalidateQueries({ queryKey: ['user-coins'] });
      toast.success(t.ai_makeover_applied_title, {
        description: t.ai_makeover_applied_description,
      });
      onOpenChange(false);
      setMakeoverContent('');
    },
    onError: () => {
      toast.error(t.ai_makeover_error);
    },
  });

  if (!isOwner) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.ai_makeover}</DialogTitle>
            <DialogDescription>
              {t.ai_makeover_description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!makeoverContent ? (
              <>
                <div className="rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 text-purple-800 dark:text-purple-200">
                    <Wand2 className="h-5 w-5" />
                    <span className="font-semibold">{t.ai_makeover_features}</span>
                  </div>
                  <ul className="mt-2 space-y-1 text-sm text-purple-700 dark:text-purple-300">
                    <li>• {t.ai_makeover_feature_1}</li>
                    <li>• {t.ai_makeover_feature_2}</li>
                    <li>• {t.ai_makeover_feature_3}</li>
                    <li>• {t.ai_makeover_feature_4}</li>
                  </ul>
                </div>

                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm font-medium mb-2">{t.original_content}</p>
                  <p className="text-sm whitespace-pre-wrap">{originalContent}</p>
                </div>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    {t.ai_makeover_cost.replace('{cost}', MAKEOVER_COST.toString())}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-sm font-medium mb-2">{t.original_content}</p>
                    <p className="text-sm whitespace-pre-wrap">{originalContent}</p>
                  </div>
                  <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-800">
                    <p className="text-sm font-medium mb-2 text-green-800 dark:text-green-200">
                      {t.improved_content}
                    </p>
                    <p className="text-sm whitespace-pre-wrap text-green-700 dark:text-green-300">
                      {makeoverContent}
                    </p>
                  </div>
                </div>
                <Textarea
                  value={makeoverContent}
                  onChange={(e) => setMakeoverContent(e.target.value)}
                  className="min-h-[100px]"
                  placeholder={t.edit_improved_content}
                />
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            {!makeoverContent ? (
              <Button
                onClick={() => makeoverMutation.mutate()}
                disabled={makeoverMutation.isPending}
              >
                {makeoverMutation.isPending ? t.processing : t.generate_makeover}
              </Button>
            ) : (
              <Button
                onClick={() => applyMutation.mutate(makeoverContent)}
                disabled={applyMutation.isPending}
              >
                {applyMutation.isPending ? t.applying : t.apply_changes}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}
