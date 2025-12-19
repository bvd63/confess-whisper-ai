import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { Clock3 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface BoostConfessionButtonProps {
  confessionId: string;
  isOwner: boolean;
  boostExpiresAt?: string | null;
  onBoostActivated?: (expiresAt: string) => void;
}

const BOOST_COST = 25;
const BOOST_DURATION_HOURS = 24;

const getRemainingMs = (expiresAt?: string | null) => {
  if (!expiresAt) return 0;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return diff > 0 ? diff : 0;
};

const formatTimeLeft = (ms: number) => {
  if (ms <= 0) return '0h';
  const totalHours = Math.ceil(ms / 3600000);
  
  if (totalHours < 1) return '<1h';
  return `${totalHours}h`;
};

export function BoostConfessionButton({
  confessionId,
  isOwner,
  boostExpiresAt = null,
  onBoostActivated,
}: BoostConfessionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeUntil, setActiveUntil] = useState<string | null>(boostExpiresAt);
  const [remainingMs, setRemainingMs] = useState(() => getRemainingMs(boostExpiresAt));
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const isActive = remainingMs > 0;
  const formattedTimeLeft = formatTimeLeft(remainingMs);

  useEffect(() => {
    setActiveUntil(boostExpiresAt);
  }, [boostExpiresAt]);

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

  const boostMutation = useMutation<string, Error, void>({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: balance } = await supabase
        .from('user_coins')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (!balance || balance.balance < BOOST_COST) {
        throw new Error('Insufficient coins');
      }

      const { data: deductResult, error: deductError } = await supabase
        .rpc('deduct_coins', {
          _user_id: user.id,
          _amount: BOOST_COST,
          _type: 'boost_confession',
          _description: 'Boosted confession',
          _reference_id: confessionId,
        });

      if (deductError) throw deductError;
      if (!deductResult) throw new Error('Failed to deduct coins');

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + BOOST_DURATION_HOURS);
      const expiresIso = expiresAt.toISOString();

      // Insert or update boost record
      const { data: boostData, error: boostError } = await supabase
        .from('confession_boosts')
        .upsert({
          confession_id: confessionId,
          user_id: user.id,
          boost_until: expiresIso,
          ends_at: expiresIso,
          status: 'ACTIVE',
          coins_spent: BOOST_COST,
        })
        .select('ends_at')
        .single();

      if (boostError) throw boostError;
      return boostData?.ends_at ?? expiresIso;
    },
    onSuccess: (expiresAt) => {
      queryClient.invalidateQueries({ queryKey: ['user-coins'] });
      queryClient.invalidateQueries({ queryKey: ['confessions'] });
      toast.success(t.boost_confirm);
      setActiveUntil(expiresAt);
      setIsOpen(false);
      onBoostActivated?.(expiresAt);
    },
    onError: (error: Error) => {
      if (error.message === 'Insufficient coins') {
        toast.error(t.boost_not_enough);
      } else {
        toast.error(t.boost_error_active);
      }
    },
  });

  if (!isOwner) return null;

  const handleConfirm = () => {
    boostMutation.mutate();
  };

  if (isActive) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="bg-primary/20 border-primary/30 text-primary-foreground cursor-not-allowed inline-flex items-center justify-center gap-2"
      >
        <span className="text-base leading-none">⚡</span>
        <span className="font-semibold">{t.boost_active}</span>
        <Clock3 className="w-3.5 h-3.5" />
        <span>{formattedTimeLeft}</span>
      </Button>
    );
  }

  return (
    <>
      <Button
        size="sm"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center gap-2"
      >
        <span className="text-base leading-none">⚡</span>
        <span className="font-semibold">{t.boost_cta}</span>
        <span>·</span>
        <span>{BOOST_COST} {t.coins_title?.toLowerCase() || 'coins'}</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-[#2a2e5c] via-[#19192f] to-[#0d0d1b] border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <span className="text-xl">⚡</span>
              {t.confirm?.boostConfession?.title || 'Boost Confession'}
            </DialogTitle>
            <DialogDescription className="text-white/70">
              {t.confirm?.boostConfession?.message || `Boost this confession for 24 hours for ${BOOST_COST} coins?`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="rounded-lg bg-white/5 p-3 space-y-2">
              <p className="text-sm font-semibold text-white">
                {t.boost_price?.replace('{price}', BOOST_COST.toString()) || `${BOOST_COST} coins`}
              </p>
            </div>

            <div className="space-y-2 text-sm text-white/80">
              <p className="font-medium text-white">Benefits:</p>
              <ul className="space-y-1 pl-4">
                <li className="list-disc">More visibility in the feed</li>
                <li className="list-disc">Shown higher for 24 hours</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={boostMutation.isPending}>
              {t.cancel || 'Cancel'}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={boostMutation.isPending}
              className="inline-flex items-center justify-center whitespace-nowrap"
            >
              {boostMutation.isPending ? (t.processing || 'Processing...') : (t.boost_confirm_button || 'Boost confession')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
