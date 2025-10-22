import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Star, Heart, Flame, Diamond, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

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
      const { error } = await supabase.rpc('give_award', {
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
      console.error('Error giving award:', error);
      toast.error('Failed to give award. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Give an Award</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Show your appreciation! The creator will receive 50% of the award value.
          </p>

          <div className="grid grid-cols-2 gap-3">
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
                    'p-4 rounded-lg border-2 transition-all',
                    'flex flex-col items-center gap-2',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    isSelected
                      ? `${award.bgColor} ${award.borderColor}`
                      : 'bg-background hover:bg-secondary border-border',
                  )}
                >
                  <Icon className={cn('w-8 h-8', award.color)} />
                  <span className="font-semibold">{award.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {award.cost} coins
                  </span>
                  {!canAfford && (
                    <span className="text-xs text-destructive">
                      Insufficient
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {selectedAward && (
            <div className="p-3 bg-secondary/50 rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span>Award cost:</span>
                <span className="font-semibold">{selectedAward.cost} coins</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Creator earns:</span>
                <span>{Math.floor(selectedAward.cost / 2)} coins</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Your balance:</span>
                <span>{balance || 0} coins</span>
              </div>
            </div>
          )}

          <Button
            onClick={handleGiveAward}
            disabled={loading || !selectedAward || (selectedAward && selectedAward.cost > (balance || 0))}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {selectedAward && (
                  <selectedAward.icon className="w-4 h-4 mr-2" />
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
