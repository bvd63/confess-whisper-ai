import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, Sparkles, Check, ChevronDown, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCoins } from "@/hooks/useCoins";
import { ExpiryTimer } from "@/components/ExpiryTimer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/translated-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
interface Flair {
  id: string;
  name_key: string;
  icon: string;
  cost: number;
  rarity: string;
  required_plan?: string;
}
interface UserFlair {
  id: string;
  flair_id: string;
  is_equipped: boolean;
  expires_at: string | null;
  acquired_at: string | null;
  purchase_scope?: string;
}
interface FlairsShopProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
export const FlairsShop = ({
  userId,
  open,
  onOpenChange
}: FlairsShopProps) => {
  const [flairs, setFlairs] = useState<Flair[]>([]);
  const [userFlairs, setUserFlairs] = useState<UserFlair[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [userTier, setUserTier] = useState<"free" | "premium" | "vip">("free");
  const {
    toast
  } = useToast();
  const {
    t
  } = useLanguage();
  const {
    balance: coinsBalance,
    refetch: refetchCoins
  } = useCoins(userId);
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, userId]);
  const loadData = async () => {
    setLoading(true);
    try {
      // Load user tier and trial status
      const {
        data: profile
      } = await supabase.from('profiles').select('subscription_tier, trial_active, trial_premium_ends_at').eq('user_id', userId).maybeSingle();

      // If on active Premium trial, treat as premium tier
      let tier = (profile?.subscription_tier || 'free') as "free" | "premium" | "vip";
      if (profile?.trial_active && profile?.trial_premium_ends_at) {
        const trialEndsAt = new Date(profile.trial_premium_ends_at);
        if (trialEndsAt > new Date()) {
          tier = 'premium';
        }
      }
      setUserTier(tier);

      // Load available flairs
      const {
        data: flairsData,
        error: flairsError
      } = await supabase.from('profile_flairs').select('*').eq('is_active', true).order('cost', {
        ascending: true
      });
      if (flairsError) throw flairsError;
      setFlairs(flairsData || []);

      // Load user's owned flairs
      const {
        data: userFlairsData,
        error: userFlairsError
      } = await supabase.from('user_flairs').select('id, flair_id, is_equipped, expires_at, acquired_at, purchase_scope').eq('user_id', userId);
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
      const {
        data,
        error
      } = await supabase.functions.invoke('purchase-flair', {
        body: {
          flairId: flair.id,
          equip: true
        }
      });
      if (error) throw error;
      if (data.error) {
        toast({
          title: t.error_generic,
          description: data.error,
          variant: "destructive"
        });
        return;
      }

      // Success toast with flair details
      const flairName = t[flair.name_key as keyof typeof t] || flair.name_key;
      toast({
        title: `${flair.icon} ${t.flair_purchased_title}`,
        description: `${flairName} ${t.flair_purchased_description}`
      });

      // Reload data
      await loadData();
    } catch (error) {
      console.error('Error purchasing flair:', error);
      toast({
        title: t.error_generic,
        description: t.flair_purchase_error,
        variant: "destructive"
      });
    } finally {
      setPurchasing(null);
    }
  };
  const handleEquip = async (userFlairId: string) => {
    try {
      // Unequip all first
      await supabase.from('user_flairs').update({
        is_equipped: false
      }).eq('user_id', userId).eq('is_equipped', true);

      // Equip selected
      const {
        error
      } = await supabase.from('user_flairs').update({
        is_equipped: true
      }).eq('id', userFlairId);
      if (error) throw error;
      toast({
        title: t.success,
        description: t.flair_equipped
      });
      await loadData();
    } catch (error) {
      console.error('Error equipping flair:', error);
      toast({
        title: t.error_generic,
        description: t.error_generic,
        variant: "destructive"
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
  const canPurchase = (flair: Flair) => {
    const tierLevel: Record<string, number> = {
      free: 0,
      premium: 1,
      vip: 2
    };
    const userLevel = tierLevel[userTier] || 0;
    const requiredLevel = tierLevel[flair.required_plan || 'free'] || 0;
    return userLevel >= requiredLevel;
  };
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'bg-gray-500';
      case 'uncommon':
        return 'bg-green-500';
      case 'rare':
        return 'bg-blue-500';
      case 'epic':
        return 'bg-purple-500';
      case 'legendary':
        return 'bg-amber-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Filter flairs by tier and group them
  const freeFlairs = flairs.filter(f => !f.required_plan || f.required_plan === 'free');
  const premiumFlairs = flairs.filter(f => f.required_plan === 'premium');
  const vipFlairs = flairs.filter(f => f.required_plan === 'vip');

  // Show all sections regardless of user tier
  const showFree = true;
  const showPremium = true;
  const showVIP = true;
  const renderFlairCard = (flair: Flair) => {
    const owned = isOwned(flair.id);
    const expired = isExpired(flair.id);
    const equipped = isEquipped(flair.id);
    const userFlair = userFlairs.find(uf => uf.flair_id === flair.id);
    const canBuy = canPurchase(flair);
    const isLocked = !canBuy;
    return <Card key={flair.id} className={`p-4 flex flex-col items-center gap-2 relative hover:scale-105 transition-transform ${equipped ? 'ring-2 ring-primary' : ''} ${isLocked ? 'opacity-60' : ''}`}>
        <Badge className={`absolute top-2 right-2 text-xs ${getRarityColor(flair.rarity)}`}>
          {t[`rarity_${flair.rarity}` as keyof typeof t] || flair.rarity}
        </Badge>
        
        {isLocked && <div className="absolute top-2 left-2">
            <Lock className="w-4 h-4 text-muted-foreground" />
          </div>}
        
        <div className="text-4xl">{flair.icon}</div>
        <p className="text-sm font-medium text-center">
          {t[flair.name_key as keyof typeof t] || flair.name_key}
        </p>

        {isLocked && <Badge variant="secondary" className="text-[10px]">
            {flair.required_plan === 'premium' ? t.subscription_plan_premium : t.subscription_plan_vip} {t.required}
          </Badge>}

        {owned && userFlair?.expires_at && <ExpiryTimer expiresAt={userFlair.expires_at} className="text-[10px]" showIcon={false} />}

        {!owned && !expired && !isLocked && <p className="text-[10px] text-muted-foreground text-center">
            {t.shop_expires_in.replace('{days}', '5')}
          </p>}
        
        <p className="text-xs font-semibold text-primary flex items-center gap-1">
          <Coins className="w-3 h-3" />
          {flair.cost}
        </p>

        {expired ? <Button size="sm" onClick={() => handlePurchase(flair)} disabled={purchasing === flair.id || coinsBalance < flair.cost || !canBuy} className="w-full gap-1" variant="outline">
            <Coins className="w-3 h-3" />
            {t.buy_again} ({flair.cost})
          </Button> : owned ? equipped ? <Button size="sm" variant="outline" disabled className="w-full gap-1">
              <Check className="w-3 h-3" />
              {t.equipped}
            </Button> : <Button size="sm" variant="outline" onClick={() => handleEquip(userFlair!.id)} className="w-full">
              {t.equip}
            </Button> : isLocked ? <Button size="sm" disabled className="w-full gap-1" variant="outline">
            <Lock className="w-3 h-3" />
            {t.upgrade_required}
          </Button> : <Button size="sm" onClick={() => handlePurchase(flair)} disabled={purchasing === flair.id || coinsBalance < flair.cost} className="w-full gap-1">
            <Coins className="w-3 h-3" />
            {flair.cost}
          </Button>}
      </Card>;
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
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
          <DialogDescription className="text-sm text-muted-foreground space-y-1">
            <p>{t.flair_shop_description}</p>
            
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] sm:h-[500px] pr-4">
          {loading ? <div className="text-center py-8 text-muted-foreground">{t.loading}</div> : <Accordion type="multiple" defaultValue={["free", "premium", "vip"]} className="w-full space-y-2">
              {showFree && freeFlairs.length > 0 && <AccordionItem value="free" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">{t.shop_free_tier}</span>
                      <Badge variant="secondary">{freeFlairs.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                      {freeFlairs.map(renderFlairCard)}
                    </div>
                  </AccordionContent>
                </AccordionItem>}

              {showPremium && premiumFlairs.length > 0 && <AccordionItem value="premium" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                        {t.shop_premium_tier}
                      </span>
                      <Badge className="bg-violet-500">{premiumFlairs.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                      {premiumFlairs.map(renderFlairCard)}
                    </div>
                  </AccordionContent>
                </AccordionItem>}

              {showVIP && vipFlairs.length > 0 && <AccordionItem value="vip" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                        {t.shop_vip_tier}
                      </span>
                      <Badge className="bg-amber-500">{vipFlairs.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                      {vipFlairs.map(renderFlairCard)}
                    </div>
                  </AccordionContent>
                </AccordionItem>}
            </Accordion>}

          {!loading && flairs.length === 0 && <div className="text-center py-8 text-muted-foreground">{t.shop_empty}</div>}
        </ScrollArea>
      </DialogContent>
    </Dialog>;
};