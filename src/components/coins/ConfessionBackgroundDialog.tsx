import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Palette } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';

interface ConfessionBackgroundDialogProps {
  confessionId: string;
  isOwner: boolean;
  currentBackground?: string;
}

interface Background {
  id: string;
  name: string;
  gradient: string;
  cost: number;
}

const BACKGROUNDS: Background[] = [
  { id: 'default', name: 'Default', gradient: 'bg-card', cost: 0 },
  { id: 'sunset', name: 'Sunset', gradient: 'bg-gradient-to-br from-orange-400 to-pink-600', cost: 75 },
  { id: 'ocean', name: 'Ocean', gradient: 'bg-gradient-to-br from-blue-400 to-cyan-600', cost: 75 },
  { id: 'forest', name: 'Forest', gradient: 'bg-gradient-to-br from-green-400 to-emerald-600', cost: 75 },
  { id: 'purple', name: 'Purple Dream', gradient: 'bg-gradient-to-br from-purple-400 to-pink-600', cost: 100 },
  { id: 'fire', name: 'Fire', gradient: 'bg-gradient-to-br from-red-500 to-orange-600', cost: 100 },
  { id: 'galaxy', name: 'Galaxy', gradient: 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500', cost: 150 },
  { id: 'gold', name: 'Gold', gradient: 'bg-gradient-to-br from-yellow-400 to-amber-600', cost: 150 },
];

export function ConfessionBackgroundDialog({
  confessionId,
  isOwner,
  currentBackground = 'default',
}: ConfessionBackgroundDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBg, setSelectedBg] = useState(currentBackground);
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const { data: userCoins } = useQuery({
    queryKey: ['user-coins'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data } = await supabase
        .from('user_coins')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      return data?.balance ?? 0;
    },
  });

  const applyBackgroundMutation = useMutation({
    mutationFn: async (backgroundId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const background = BACKGROUNDS.find(bg => bg.id === backgroundId);
      if (!background) throw new Error('Background not found');

      // Check if user needs to pay
      if (background.cost > 0 && backgroundId !== currentBackground) {
        // Check balance
        if (!userCoins || userCoins < background.cost) {
          throw new Error('Insufficient coins');
        }

        // Deduct coins
        const { error: txError } = await supabase
          .from('coin_transactions')
          .insert({
            user_id: user.id,
            amount: -background.cost,
            type: 'purchase',
            description: `${background.name} background for confession`,
          });

        if (txError) throw txError;
      }

      // Apply background
      const { error: updateError } = await supabase
        .from('confessions')
        .update({ background: backgroundId } as any)
        .eq('id', confessionId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['confessions'] });
      queryClient.invalidateQueries({ queryKey: ['user-coins'] });
      toast.success(t.background_applied_title, {
        description: t.background_applied_description,
      });
      setIsOpen(false);
    },
    onError: (error: Error) => {
      if (error.message === 'Insufficient coins') {
        toast.error(t.insufficient_coins);
      } else {
        toast.error(t.background_error);
      }
    },
  });

  if (!isOwner) return null;

  const selectedBackground = BACKGROUNDS.find(bg => bg.id === selectedBg);
  const cost = selectedBackground?.cost ?? 0;
  const isCurrentBg = selectedBg === currentBackground;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-1"
      >
        <Palette className="h-3 w-3" />
        {t.custom_background}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t.custom_background}</DialogTitle>
            <DialogDescription>
              {t.custom_background_description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <span className="text-sm font-medium">{t.your_balance}</span>
              <span className="text-sm font-bold">{userCoins ?? 0} {t.coins}</span>
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <div className="grid grid-cols-2 gap-4">
                {BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => setSelectedBg(bg.id)}
                    className={`relative rounded-lg overflow-hidden transition-all ${
                      selectedBg === bg.id
                        ? 'ring-2 ring-primary scale-105'
                        : 'hover:scale-102'
                    }`}
                  >
                    <div className={`h-32 ${bg.gradient} flex items-center justify-center`}>
                      <span className="text-white font-semibold drop-shadow-lg">
                        {bg.name}
                      </span>
                    </div>
                    <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                      {bg.cost === 0 ? t.free : `${bg.cost} ${t.coins}`}
                    </div>
                    {bg.id === currentBackground && (
                      <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                        {t.current}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>

            {selectedBackground && (
              <div className="rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-4 border border-indigo-200 dark:border-indigo-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-indigo-800 dark:text-indigo-200">
                      {selectedBackground.name}
                    </p>
                    <p className="text-sm text-indigo-600 dark:text-indigo-300">
                      {isCurrentBg ? t.already_applied : `${t.cost}: ${cost} ${t.coins}`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              {t.cancel}
            </Button>
            <Button
              onClick={() => applyBackgroundMutation.mutate(selectedBg)}
              disabled={applyBackgroundMutation.isPending || isCurrentBg}
            >
              {applyBackgroundMutation.isPending
                ? t.applying
                : isCurrentBg
                ? t.current
                : t.apply_background}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
