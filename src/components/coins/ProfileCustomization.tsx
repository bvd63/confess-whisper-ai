import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Palette, Sparkles, Crown, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface ProfileCustomizationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const THEMES = [
  { id: 'default', name: 'Default', color: 'bg-gradient-to-br from-primary/20 to-primary/10', cost: 0 },
  { id: 'ocean', name: 'Ocean', color: 'bg-gradient-to-br from-blue-500/20 to-cyan-500/10', cost: 200 },
  { id: 'sunset', name: 'Sunset', color: 'bg-gradient-to-br from-orange-500/20 to-pink-500/10', cost: 200 },
  { id: 'forest', name: 'Forest', color: 'bg-gradient-to-br from-green-500/20 to-emerald-500/10', cost: 200 },
  { id: 'galaxy', name: 'Galaxy', color: 'bg-gradient-to-br from-purple-500/20 to-indigo-500/10', cost: 300 },
  { id: 'royal', name: 'Royal', color: 'bg-gradient-to-br from-amber-500/20 to-yellow-500/10', cost: 500 },
];

const BADGES = [
  { id: 'star', name: 'Star', icon: '⭐', cost: 150 },
  { id: 'fire', name: 'Fire', icon: '🔥', cost: 150 },
  { id: 'gem', name: 'Gem', icon: '💎', cost: 200 },
  { id: 'crown', name: 'Crown', icon: '👑', cost: 300 },
  { id: 'rocket', name: 'Rocket', icon: '🚀', cost: 200 },
  { id: 'heart', name: 'Heart', icon: '❤️', cost: 150 },
];

export const ProfileCustomization = ({ open, onOpenChange, userId }: ProfileCustomizationProps) => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);

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

  // Get user's current customizations
  const { data: customizations } = useQuery({
    queryKey: ['profileCustomizations', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('theme, custom_badge')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data as { theme?: string; custom_badge?: string };
    },
  });

  const handlePurchaseTheme = async (theme: typeof THEMES[0]) => {
    if (theme.cost > (balance || 0)) {
      toast.error(`Insufficient coins. You need ${theme.cost} coins.`);
      return;
    }

    setLoading(true);
    try {
      // Deduct coins
      const { error: txError } = await supabase
        .from('coin_transactions')
        .insert({
          user_id: userId,
          amount: -theme.cost,
          type: 'purchase',
          description: `Purchased ${theme.name} theme`,
        });

      if (txError) throw txError;

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ theme: theme.id } as any)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      toast.success(`${theme.name} theme activated!`);
      queryClient.invalidateQueries({ queryKey: ['coinBalance'] });
      queryClient.invalidateQueries({ queryKey: ['profileCustomizations', userId] });
      setSelectedTheme(null);
    } catch (error) {
      console.error('Error purchasing theme:', error);
      toast.error('Failed to purchase theme. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseBadge = async (badge: typeof BADGES[0]) => {
    if (badge.cost > (balance || 0)) {
      toast.error(`Insufficient coins. You need ${badge.cost} coins.`);
      return;
    }

    setLoading(true);
    try {
      // Deduct coins
      const { error: txError } = await supabase
        .from('coin_transactions')
        .insert({
          user_id: userId,
          amount: -badge.cost,
          type: 'purchase',
          description: `Purchased ${badge.name} badge`,
        });

      if (txError) throw txError;

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ custom_badge: badge.id } as any)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      toast.success(`${badge.name} badge equipped!`);
      queryClient.invalidateQueries({ queryKey: ['coinBalance'] });
      queryClient.invalidateQueries({ queryKey: ['profileCustomizations', userId] });
      setSelectedBadge(null);
    } catch (error) {
      console.error('Error purchasing badge:', error);
      toast.error('Failed to purchase badge. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Profile Customization
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="themes">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="themes">
              <Palette className="w-4 h-4 mr-2" />
              Themes
            </TabsTrigger>
            <TabsTrigger value="badges">
              <Crown className="w-4 h-4 mr-2" />
              Badges
            </TabsTrigger>
          </TabsList>

          <TabsContent value="themes" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">
              Customize your profile with unique themes!
            </p>
            <div className="grid grid-cols-2 gap-3">
              {THEMES.map((theme) => {
                const isOwned = theme.cost === 0 || customizations?.theme === theme.id;
                const isActive = customizations?.theme === theme.id;

                return (
                  <button
                    key={theme.id}
                    onClick={() => !isActive && setSelectedTheme(theme.id)}
                    disabled={isActive}
                    className={cn(
                      'p-4 rounded-lg border-2 transition-all relative',
                      isActive
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50',
                      isActive && 'cursor-default'
                    )}
                  >
                    {isActive && (
                      <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-semibold">
                        Active
                      </div>
                    )}
                    <div className={cn('w-full h-24 rounded-lg mb-2', theme.color)} />
                    <p className="font-semibold text-sm">{theme.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {isOwned ? (isActive ? 'Equipped' : 'Owned') : `${theme.cost} coins`}
                    </p>
                  </button>
                );
              })}
            </div>

            {selectedTheme && (
              <div className="p-3 bg-secondary/50 rounded-lg">
                {(() => {
                  const theme = THEMES.find(t => t.id === selectedTheme)!;
                  return (
                    <>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold">{theme.name}</span>
                        <span>{theme.cost} coins</span>
                      </div>
                      <Button
                        onClick={() => handlePurchaseTheme(theme)}
                        disabled={loading || theme.cost > (balance || 0)}
                        className="w-full"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          'Purchase & Activate'
                        )}
                      </Button>
                    </>
                  );
                })()}
              </div>
            )}
          </TabsContent>

          <TabsContent value="badges" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">
              Show off your personality with custom badges!
            </p>
            <div className="grid grid-cols-3 gap-3">
              {BADGES.map((badge) => {
                const isOwned = customizations?.custom_badge === badge.id;
                const isActive = customizations?.custom_badge === badge.id;

                return (
                  <button
                    key={badge.id}
                    onClick={() => !isActive && setSelectedBadge(badge.id)}
                    disabled={isActive}
                    className={cn(
                      'p-4 rounded-lg border-2 transition-all relative',
                      'flex flex-col items-center gap-2',
                      isActive
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50',
                      isActive && 'cursor-default'
                    )}
                  >
                    {isActive && (
                      <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-semibold">
                        ✓
                      </div>
                    )}
                    <span className="text-3xl">{badge.icon}</span>
                    <p className="font-semibold text-xs">{badge.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {isOwned ? 'Equipped' : `${badge.cost} coins`}
                    </p>
                  </button>
                );
              })}
            </div>

            {selectedBadge && (
              <div className="p-3 bg-secondary/50 rounded-lg">
                {(() => {
                  const badge = BADGES.find(b => b.id === selectedBadge)!;
                  return (
                    <>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold">{badge.icon} {badge.name}</span>
                        <span>{badge.cost} coins</span>
                      </div>
                      <Button
                        onClick={() => handlePurchaseBadge(badge)}
                        disabled={loading || badge.cost > (balance || 0)}
                        className="w-full"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          'Purchase & Equip'
                        )}
                      </Button>
                    </>
                  );
                })()}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="text-sm text-muted-foreground text-center">
          Your balance: <span className="font-semibold">{balance || 0} coins</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
