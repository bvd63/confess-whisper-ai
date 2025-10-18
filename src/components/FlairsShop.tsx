import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, Sparkles, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCoins } from "@/hooks/useCoins";
import { ExpiryTimer } from "@/components/ExpiryTimer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/translated-dialog";

interface Flair {
  id: string;
  name_key: string;
  icon: string;
  cost: number;
  rarity: string;
}

interface UserFlair {
  id: string;
  flair_id: string;
  is_equipped: boolean;
  expires_at: string | null;
  acquired_at: string | null;
}

interface FlairsShopProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FlairsShop = ({ userId, open, onOpenChange }: FlairsShopProps) => {
  const [flairs, setFlairs] = useState<Flair[]>([]);
  const [userFlairs, setUserFlairs] = useState<UserFlair[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();
  const { balance: coinsBalance, refetch: refetchCoins } = useCoins(userId);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load available flairs
      const { data: flairsData, error: flairsError } = await supabase
        .from('profile_flairs')
        .select('*')
        .eq('is_active', true)
        .order('cost', { ascending: true });

      if (flairsError) throw flairsError;
      setFlairs(flairsData || []);

      // Load user's owned flairs
      const { data: userFlairsData, error: userFlairsError } = await supabase
        .from('user_flairs')
        .select('*')
        .eq('user_id', userId);

      if (userFlairsError) throw userFlairsError;
      setUserFlairs(userFlairsData || []);

      // Refetch coins balance
      await refetchCoins();
    } catch (error) {
      console.error('Error loading flairs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (flair: Flair) => {
    setPurchasing(flair.id);
    try {
      const { data, error } = await supabase.functions.invoke('purchase-flair', {
        body: { flairId: flair.id, equip: true }
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: t.error_generic,
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t.flair_purchased_title,
        description: t.flair_purchased_description,
      });

      // Reload data
      await loadData();
    } catch (error) {
      console.error('Error purchasing flair:', error);
      toast({
        title: t.error_generic,
        description: t.flair_purchase_error,
        variant: "destructive",
      });
    } finally {
      setPurchasing(null);
    }
  };

  const handleEquip = async (userFlairId: string) => {
    try {
      // Unequip all first
      await supabase
        .from('user_flairs')
        .update({ is_equipped: false })
        .eq('user_id', userId)
        .eq('is_equipped', true);

      // Equip selected
      const { error } = await supabase
        .from('user_flairs')
        .update({ is_equipped: true })
        .eq('id', userFlairId);

      if (error) throw error;

      toast({
        title: t.success,
        description: t.flair_equipped,
      });

      await loadData();
    } catch (error) {
      console.error('Error equipping flair:', error);
      toast({
        title: t.error_generic,
        description: t.error_generic,
        variant: "destructive",
      });
    }
  };

  const isOwned = (flairId: string) => {
    const userFlair = userFlairs.find(uf => uf.flair_id === flairId);
    if (!userFlair) return false;
    // Check if expired
    if (userFlair.expires_at) {
      const now = new Date().getTime();
      const expiry = new Date(userFlair.expires_at).getTime();
      if (expiry <= now) return false; // Expired, treat as not owned
    }
    return true;
  };

  const isExpired = (flairId: string) => {
    const userFlair = userFlairs.find(uf => uf.flair_id === flairId);
    if (!userFlair || !userFlair.expires_at) return false;
    const now = new Date().getTime();
    const expiry = new Date(userFlair.expires_at).getTime();
    return expiry <= now;
  };

  const isEquipped = (flairId: string) => {
    return userFlairs.some(uf => uf.flair_id === flairId && uf.is_equipped && !isExpired(flairId));
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-500';
      case 'uncommon': return 'bg-green-500';
      case 'rare': return 'bg-blue-500';
      case 'epic': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-lg sm:text-xl">
            <span className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              {t.flairs_shop}
            </span>
            <span className="flex items-center gap-2 text-yellow-600">
              <Coins className="w-5 h-5" />
              {coinsBalance}
            </span>
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t.flair_shop_description}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] sm:h-[500px] pr-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">{t.loading}</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {flairs.map((flair) => {
                const owned = isOwned(flair.id);
                const expired = isExpired(flair.id);
                const equipped = isEquipped(flair.id);
                const userFlair = userFlairs.find(uf => uf.flair_id === flair.id);

                return (
                  <Card 
                    key={flair.id} 
                    className={`p-4 flex flex-col items-center gap-2 relative ${
                      equipped ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <Badge className={`absolute top-2 right-2 text-xs ${getRarityColor(flair.rarity)}`}>
                      {t[`rarity_${flair.rarity}` as keyof typeof t] || flair.rarity}
                    </Badge>
                    
                    <div className="text-4xl">{flair.icon}</div>
                    <p className="text-sm font-medium text-center">
                      {t[flair.name_key as keyof typeof t] || flair.name_key}
                    </p>

                    {/* Show expiry timer for owned active flairs */}
                    {owned && userFlair?.expires_at && (
                      <ExpiryTimer expiresAt={userFlair.expires_at} className="text-[10px]" showIcon={false} />
                    )}

                    {/* Show duration for non-owned flairs */}
                    {!owned && !expired && (
                      <p className="text-[10px] text-muted-foreground text-center">
                        {t.badge_active_for}
                      </p>
                    )}

                    {/* Expired - show Buy Again */}
                    {expired ? (
                      <Button
                        size="sm"
                        onClick={() => handlePurchase(flair)}
                        disabled={purchasing === flair.id || coinsBalance < flair.cost}
                        className="w-full gap-1"
                        variant="outline"
                      >
                        <Coins className="w-3 h-3" />
                        {t.buy_again} ({flair.cost})
                      </Button>
                    ) : owned ? (
                      equipped ? (
                        <Button size="sm" variant="outline" disabled className="w-full gap-1">
                          <Check className="w-3 h-3" />
                          {t.equipped}
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleEquip(userFlair!.id)}
                          className="w-full"
                        >
                          {t.equip}
                        </Button>
                      )
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handlePurchase(flair)}
                        disabled={purchasing === flair.id || coinsBalance < flair.cost}
                        className="w-full gap-1"
                      >
                        <Coins className="w-3 h-3" />
                        {flair.cost}
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};