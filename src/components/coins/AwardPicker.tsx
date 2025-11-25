import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Star, Heart, Flame, Diamond, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { logError } from '@/lib/logger';

interface AwardPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  confessionId: string;
}

const AWARDS = [
  {
    type: 'star' as const,
    name: 'Star',
    icon: Star,
    cost: 50,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10 hover:bg-yellow-500/20',
    borderColor: 'border-yellow-500/30',
  },
  {
    type: 'heart' as const,
    name: 'Heart',
    icon: Heart,
    cost: 100,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10 hover:bg-red-500/20',
    borderColor: 'border-red-500/30',
  },
  {
    type: 'fire' as const,
    name: 'Fire',
    icon: Flame,
    cost: 150,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10 hover:bg-orange-500/20',
    borderColor: 'border-orange-500/30',
  },
  {
    type: 'diamond' as const,
    name: 'Diamond',
    icon: Diamond,
    cost: 300,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 hover:bg-blue-500/20',
    borderColor: 'border-blue-500/30',
  },
];

export const AwardPicker = ({ open, onOpenChange, confessionId }: AwardPickerProps) => {
  const { t } = useLanguage();
  const [selectedAward, setSelectedAward] = useState<typeof AWARDS[0] | null>(null);
  const [loading, setLoading] = useState(false);

  // Get user's current balance
  const { data: balance } = useQuery({
    queryKey: ['coinBalance'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { data, error } = await supabase
        .from('user_coins')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data?.balance || 0;
    },
  });

  const handleGiveAward = async () => {
    if (!selectedAward) return;

    if (selectedAward.cost > (balance || 0)) {
      toast.error(`Insufficient coins. You need ${selectedAward.cost} coins.`);
      return;
    }

    setLoading(true);
    try {
      const { error } = await (supabase.rpc as any)('give_award', {
        confession_id: confessionId,
        award_type: selectedAward.type,
      });

      if (error) throw error;

      toast.success(
        <>
          <div className="flex items-center gap-2">
            <selectedAward.icon className={cn('w-5 h-5', selectedAward.color)} />
            <span>Award given! The creator earned {Math.floor(selectedAward.cost / 2)} coins</span>
          </div>
        </>
      );
      
      onOpenChange(false);
      setSelectedAward(null);
    } catch (error) {
      logError('Error giving award', error as Error);
      toast.error('Failed to give award. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Give an Award</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Show your appreciation! The creator will receive 50% of the award value.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {AWARDS.map((award) => {
              const Icon = award.icon;
              const isSelected = selectedAward?.type === award.type;
              const canAfford = (balance || 0) >= award.cost;

              return (
                <button
                  key={award.type}
                  onClick={() => setSelectedAward(award)}
                  disabled={!canAfford}
                  className={cn(
                    'p-5 rounded-2xl border-2 transition-all duration-200',
                    'flex flex-col items-center gap-3',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'hover:scale-105 active:scale-95',
                    isSelected
                      ? `${award.bgColor} ${award.borderColor} shadow-lg`
                      : 'bg-card hover:bg-secondary/50 border-border hover:border-primary/30',
                  )}
                >
                  <Icon className={cn('w-10 h-10', award.color)} />
                  <span className="font-bold text-base">{award.name}</span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {award.cost} coins
                  </span>
                  {!canAfford && (
                    <span className="text-xs font-semibold text-destructive">
                      Insufficient
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {selectedAward && (
            <div className="p-4 bg-secondary/30 rounded-2xl space-y-2 border border-border/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Award cost:</span>
                <span className="font-bold">{selectedAward.cost} coins</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Creator earns:</span>
                <span className="font-semibold text-green-500">{Math.floor(selectedAward.cost / 2)} coins</span>
              </div>
              <div className="flex justify-between text-sm border-t border-border/50 pt-2 mt-2">
                <span className="text-muted-foreground">Your balance:</span>
                <span className="font-bold">{balance || 0} coins</span>
              </div>
            </div>
          )}

          <Button
            onClick={handleGiveAward}
            disabled={loading || !selectedAward || (selectedAward && selectedAward.cost > (balance || 0))}
            className="w-full h-11 rounded-xl font-semibold text-base"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {selectedAward && (
                  <selectedAward.icon className="w-5 h-5 mr-2" />
                )}
                Give Award
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
