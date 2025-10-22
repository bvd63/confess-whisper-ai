import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TrendingUp, Zap, Pin, Loader2, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface BoostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  confessionId: string;
  onBoostSuccess?: () => void;
}

const BOOST_TYPES = [
  {
    type: 'basic' as const,
    name: 'Basic Boost',
    icon: Zap,
    cost: 100,
    duration: '24 hours',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 hover:bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    description: 'Increased visibility for 24 hours',
    features: ['2x visibility', '24 hour duration', 'Priority in feed'],
  },
  {
    type: 'super' as const,
    name: 'Super Boost',
    icon: TrendingUp,
    cost: 250,
    duration: '7 days',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10 hover:bg-purple-500/20',
    borderColor: 'border-purple-500/30',
    description: 'Trending badge + extended visibility',
    features: ['5x visibility', '7 days duration', 'Trending badge', 'Top of feed'],
    popular: true,
  },
  {
    type: 'pin' as const,
    name: 'Profile Pin',
    icon: Pin,
    cost: 150,
    duration: '30 days',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10 hover:bg-orange-500/20',
    borderColor: 'border-orange-500/30',
    description: 'Pin to your profile for 30 days',
    features: ['Profile pinned', '30 days duration', 'Always visible on profile'],
  },
];

export const BoostDialog = ({ 
  open, 
  onOpenChange, 
  confessionId,
  onBoostSuccess 
}: BoostDialogProps) => {
  const { t } = useLanguage();
  const [selectedBoost, setSelectedBoost] = useState<typeof BOOST_TYPES[0] | null>(null);
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

  // Check if confession already has an active boost
  const { data: existingBoost } = useQuery({
    queryKey: ['confessionBoost', confessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('confession_boosts' as any)
        .select('*')
        .eq('confession_id', confessionId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as any;
    },
  });

  const handleBoost = async () => {
    if (!selectedBoost) return;

    if (existingBoost) {
      toast.error('This confession already has an active boost');
      return;
    }

    if (selectedBoost.cost > (balance || 0)) {
      toast.error(`Insufficient coins. You need ${selectedBoost.cost} coins.`);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc('boost_confession' as any, {
        confession_id: confessionId,
        boost_type: selectedBoost.type,
      });

      if (error) throw error;

      toast.success(
        <>
          <div className="flex items-center gap-2">
            <selectedBoost.icon className={cn('w-5 h-5', selectedBoost.color)} />
            <span>{selectedBoost.name} activated for {selectedBoost.duration}!</span>
          </div>
        </>
      );
      
      onBoostSuccess?.();
      onOpenChange(false);
      setSelectedBoost(null);
    } catch (error) {
      console.error('Error boosting confession:', error);
      toast.error('Failed to boost confession. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (existingBoost) {
    const expiresAt = new Date((existingBoost as any).expires_at || (existingBoost as any).ends_at);
    const now = new Date();
    const hoursLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Boost Active</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-primary" />
                <span className="font-semibold">Your confession is boosted!</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Expires in {hoursLeft} hours</span>
              </div>
            </div>
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Boost Your Confession</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Boost your confession to reach more people and get more engagement!
          </p>

          <div className="grid gap-3">
            {BOOST_TYPES.map((boost) => {
              const Icon = boost.icon;
              const isSelected = selectedBoost?.type === boost.type;
              const canAfford = (balance || 0) >= boost.cost;

              return (
                <button
                  key={boost.type}
                  onClick={() => setSelectedBoost(boost)}
                  disabled={!canAfford}
                  className={cn(
                    'p-4 rounded-lg border-2 transition-all text-left relative',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    isSelected
                      ? `${boost.bgColor} ${boost.borderColor}`
                      : 'bg-background hover:bg-secondary border-border',
                  )}
                >
                  {boost.popular && (
                    <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-semibold">
                      Popular
                    </div>
                  )}
                  
                  <div className="flex items-start gap-3">
                    <Icon className={cn('w-6 h-6 mt-1', boost.color)} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold">{boost.name}</h3>
                        <span className="text-sm font-bold">{boost.cost} coins</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {boost.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Clock className="w-3 h-3" />
                        <span>{boost.duration}</span>
                      </div>
                      <ul className="space-y-1">
                        {boost.features.map((feature, idx) => (
                          <li key={idx} className="text-xs flex items-center gap-1">
                            <span className="text-primary">✓</span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      {!canAfford && (
                        <p className="text-xs text-destructive mt-2">
                          Insufficient coins
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedBoost && (
            <div className="p-3 bg-secondary/50 rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span>Boost cost:</span>
                <span className="font-semibold">{selectedBoost.cost} coins</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Duration:</span>
                <span>{selectedBoost.duration}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Your balance:</span>
                <span>{balance || 0} coins</span>
              </div>
            </div>
          )}

          <Button
            onClick={handleBoost}
            disabled={loading || !selectedBoost || (selectedBoost && selectedBoost.cost > (balance || 0))}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {selectedBoost && (
                  <selectedBoost.icon className="w-4 h-4 mr-2" />
                )}
                Activate Boost
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
