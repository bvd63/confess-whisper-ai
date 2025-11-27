import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, Sparkles, Check, ChevronDown, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCoins } from "@/hooks/useCoins";
import { logDebug, logError } from "@/lib/logger";
import { ExpiryTimer } from "@/components/ExpiryTimer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/translated-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getStringTranslation } from "@/lib/translationUtils";
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
  last_equipped_at: string | null;
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
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [userTier, setUserTier] = useState<"free" | "vip">("free");
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
  const loadData = useCallback(async (retryCount = 0) => {
    setLoading(prev => hasLoaded ? prev : true);
    setError(null);
    try {
      const profilePromise = supabase.from('profiles').select('subscription_tier, trial_active, trial_premium_ends_at').eq('user_id', userId).maybeSingle();
      const flairsPromise = supabase.from('profile_flairs').select('*').eq('is_active', true).order('cost', {
        ascending: true
      });
      const userFlairsPromise = supabase.from('user_flairs').select('id, flair_id, is_equipped, expires_at, acquired_at, purchase_scope, last_equipped_at').eq('user_id', userId);
      const [profileRes, flairsRes, userFlairsRes] = await Promise.allSettled([profilePromise, flairsPromise, userFlairsPromise]);

      // Profile tier
      if (profileRes.status === 'fulfilled') {
        const {
          data: profile,
          error: profileError
        } = profileRes.value as any;
        if (profileError) logError('Profile error', profileError);
        const tier = (profile?.subscription_tier || 'free') as 'free' | 'vip';
        setUserTier(tier);
      } else {
        logError('Profile load rejected', profileRes.reason);
      }

      // Flairs list
      if (flairsRes.status === 'fulfilled') {
        const {
          data: flairsData,
          error: flairsError
        } = flairsRes.value as any;
        if (flairsError) {
          logError('Flairs error', flairsError);
          throw flairsError;
        }
        setFlairs((flairsData || []).filter((f: Flair) => f.name_key !== 'flair_sparkle'));
      } else {
        logError('Flairs load rejected', flairsRes.reason);
        throw flairsRes.reason;
      }

      // User flairs
      if (userFlairsRes.status === 'fulfilled') {
        const {
          data: userFlairsData,
          error: userFlairsError
        } = userFlairsRes.value as any;
        if (userFlairsError) logError('User flairs error', userFlairsError);
        setUserFlairs(userFlairsData || []);
      } else {
        logError('User flairs load rejected', userFlairsRes.reason);
      }

      // Trigger coins refetch without blocking (useCoins has realtime subscription)
      refetchCoins();
      setHasLoaded(true);
      setError(null);
    } catch (e: any) {
      const msg = e?.message || 'Failed to load flairs';
      // Retry transient network errors up to 2 times
      if (msg.includes('Failed to fetch') && retryCount < 2) {
        setTimeout(() => loadData(retryCount + 1), 800);
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [userId, refetchCoins, hasLoaded]);
  useEffect(() => {
    if (open) {
      setHasLoaded(false);
      loadData();
    }
    // Intenționat nu includem loadData în deps pentru a evita bucla de reîncărcare
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Real-time listener for user_flairs updates
  useEffect(() => {
    if (!userId || !open) return;
    const channel = supabase.channel(`user-flairs-${userId}`).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'user_flairs',
      filter: `user_id=eq.${userId}`
    }, payload => {
      logDebug('[FlairsShop] Real-time update', payload);
      loadData();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // Intenționat nu includem loadData în deps pentru a evita buclele
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, open]);
  const handlePurchase = async (flair: Flair) => {
    setPurchasing(flair.id);
    try {
      logDebug('[FlairsShop] Purchasing flair', {
        flairId: flair.id,
        nameKey: flair.name_key
      });
      const {
        data,
        error
      } = await supabase.functions.invoke('purchase-flair', {
        body: {
          flairId: flair.id,
          equip: true
        }
      });
      logDebug('[FlairsShop] Purchase response', {
        data,
        error
      });
      if (error) throw error;
      if (data?.error) {
        logError('[FlairsShop] Purchase error from function', data.error);
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
      logError('[FlairsShop] Error purchasing flair', error as Error);
      toast({
        title: t.error_generic,
        description: t.flair_purchase_error,
        variant: "destructive"
      });
    } finally {
      setPurchasing(null);
    }
  };
  const getCooldownEnd = (flairId: string): Date | null => {
    const userFlair = userFlairs.find(uf => uf.flair_id === flairId);
    if (!userFlair?.last_equipped_at) return null;
    const lastEquipped = new Date(userFlair.last_equipped_at);
    return new Date(lastEquipped.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days
  };
  const getCooldownRemaining = (flairId: string) => {
    const end = getCooldownEnd(flairId);
    if (!end) return null;
    const now = new Date();
    if (now < end) {
      const msRemaining = end.getTime() - now.getTime();
      const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
      return daysRemaining;
    }
    return null;
  };
  const handleEquip = async (userFlairId: string) => {
    try {
      // Prevent equipping flairs above current subscription tier
      const ownedFlair = userFlairs.find(uf => uf.id === userFlairId);
      const flair = flairs.find(f => f.id === ownedFlair?.flair_id);
      if (flair && !canPurchase(flair)) {
        toast({
          title: t.upgrade_required,
          description: t.shop_lock_vip,
          variant: "destructive"
        });
        return;
      }

      // Unequip all first (also unfeaturing them)
      await supabase.from('user_flairs').update({
        is_equipped: false,
        is_featured: false
      }).eq('user_id', userId).eq('is_equipped', true);

      // Update last_equipped_at for ALL flairs (not just VIP)
      const updateData: {
        is_equipped: boolean;
        is_featured: boolean;
        is_public: boolean;
        last_equipped_at: string;
      } = {
        is_equipped: true,
        is_featured: true,
        is_public: true,
        last_equipped_at: new Date().toISOString()
      };
      const {
        error
      } = await supabase.from('user_flairs').update(updateData).eq('id', userFlairId);
      if (error) throw error;
      toast({
        title: t.success,
        description: t.flair_equipped
      });
      await loadData();
    } catch (error) {
      logError('Error equipping flair', error as Error);
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
      vip: 1
    };
    const userLevel = tierLevel[userTier] || 0;
    const flairRequiredPlan = flair.required_plan || 'free';
    const requiredLevel = tierLevel[flairRequiredPlan as 'free' | 'vip'] || 0;
    return userLevel >= requiredLevel;
  };

  // Filter flairs by tier and group them
  // Trophy & Fire are free, Rocket is VIP
  const freeFlairs = flairs.filter(f => !f.required_plan || f.required_plan === 'free');
  const vipFlairs = flairs.filter(f => f.required_plan === 'vip');

  // Show all sections regardless of user tier
  const showFree = true;
  const showVIP = true;
  const renderFlairCard = (flair: Flair) => {
    const owned = isOwned(flair.id);
    const expired = isExpired(flair.id);
    const equipped = isEquipped(flair.id);
    const userFlair = userFlairs.find(uf => uf.flair_id === flair.id);
    const canBuy = canPurchase(flair);
    const isLocked = !canBuy;

    // Only show cooldown for active (non-expired) flairs that were unequipped
    const cooldownDays = !expired && owned ? getCooldownRemaining(flair.id) : null;
    const onCooldown = cooldownDays !== null;
    const cooldownEnd = !expired && owned ? getCooldownEnd(flair.id) : null;
    return <Card key={flair.id} className={`p-6 flex flex-col items-center gap-4 relative hover:scale-105 transition-all duration-200 rounded-2xl border-2 ${equipped ? 'border-primary/50 shadow-elegant bg-primary/5' : 'border-border/50'} ${isLocked ? 'opacity-60' : ''}`}>
        {isLocked && <div className="absolute top-3 left-3">
            <Lock className="w-5 h-5 text-muted-foreground" />
          </div>}
        
        <div className="text-6xl mb-2">{flair.icon}</div>
        <p className="text-base font-semibold text-center">
          {getStringTranslation(t, flair.name_key) || flair.name_key}
        </p>

        <div className="min-h-[40px] flex flex-col items-center justify-center gap-1">
          {isLocked && <Badge variant="secondary" className="text-[10px]">
              {t.subscription_plan_vip} {t.required}
            </Badge>}

          {owned && !onCooldown && userFlair?.expires_at && <ExpiryTimer expiresAt={userFlair.expires_at} className="text-[10px]" showIcon={false} />}

          {onCooldown && cooldownEnd && <ExpiryTimer expiresAt={cooldownEnd.toISOString()} className="text-[10px]" showIcon={false} />}

          {!owned && !expired && !isLocked && <p className="text-[10px] text-muted-foreground text-center">
              {t.shop_expires_in.replace('{days}', '5')}
            </p>}
        </div>
        
        <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
          <div className="text-lg">🪙</div>
          <span className="text-base font-bold">{flair.cost}</span>
        </div>

        {owned && !expired ? equipped ? <Button size="lg" variant="outline" disabled className="w-full gap-2 rounded-xl h-12">
              <Check className="w-5 h-5" />
              <span className="font-semibold">{t.equipped}</span>
            </Button> : isLocked ? <Button size="sm" disabled className="w-full gap-1.5 rounded-xl" variant="outline">
              <Lock className="w-4 h-4" />
              <span className="font-medium">{t.upgrade_required}</span>
            </Button> : <Button size="sm" variant="outline" onClick={() => handleEquip(userFlair!.id)} className="w-full gap-1.5 rounded-xl hover:bg-primary hover:text-primary-foreground">
              <span className="font-medium">{t.equip}</span>
            </Button> : isLocked ? <Button size="sm" disabled className="w-full gap-1.5 rounded-xl" variant="outline">
            <Lock className="w-4 h-4" />
            <span className="font-medium">{t.upgrade_required}</span>
          </Button> : <Button size="sm" onClick={() => handlePurchase(flair)} disabled={purchasing === flair.id || coinsBalance < flair.cost} className="w-full gap-1.5 rounded-xl font-medium">
            <Coins className="w-4 h-4" />
            {flair.cost}
          </Button>}
      </Card>;
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] rounded-2xl border-primary/20">
        <DialogHeader className="space-y-4">
          <DialogTitle className="flex items-center justify-between text-2xl">
            <span className="flex items-center gap-3">
              <div className="text-3xl">✨</div>
              <span className="font-bold">{t.flairs_shop}</span>
            </span>
            <span className="flex items-center gap-2.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20 mx-[55px] my-0 px-[11px] py-0 font-sans text-left bg-slate-950">
              <div className="text-xl">🪙</div>
              <span className="font-bold text-lg">{coinsBalance}</span>
            </span>
          </DialogTitle>
          <DialogDescription className="text-base text-foreground-secondary">
            {t.flair_shop_description}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[450px] sm:h-[550px] pr-4">
          {loading ? <div className="text-center py-12 space-y-4">
              <div className="w-14 h-14 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
              <p className="text-muted-foreground text-sm font-medium">{t.loading}</p>
            </div> : error ? <div className="text-center py-12 space-y-5">
              <p className="text-destructive text-sm">{error}</p>
              <Button onClick={() => loadData()} variant="outline" size="sm" className="rounded-xl">
                Try Again
              </Button>
            </div> : <Accordion type="multiple" defaultValue={["free", "vip"]} className="w-full space-y-3">
              {showFree && freeFlairs.length > 0 && <AccordionItem value="free" className="border rounded-2xl px-4 bg-card">
                  <AccordionTrigger className="hover:no-underline py-5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg font-bold">{t.shop_free_tier}</span>
                      <Badge variant="secondary" className="rounded-lg">{freeFlairs.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3 pb-2">
                      {freeFlairs.map(renderFlairCard)}
                    </div>
                  </AccordionContent>
                </AccordionItem>}

              {showVIP && vipFlairs.length > 0 && <AccordionItem value="vip" className="border rounded-2xl px-4 bg-card">
                  <AccordionTrigger className="hover:no-underline py-5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                        {t.shop_vip_tier}
                      </span>
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 rounded-lg font-semibold">{vipFlairs.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3 pb-2">
                      {vipFlairs.map(renderFlairCard)}
                    </div>
                  </AccordionContent>
                </AccordionItem>}
            </Accordion>}

          {!loading && !error && flairs.length === 0 && <div className="text-center py-8 text-muted-foreground">{t.shop_empty}</div>}
        </ScrollArea>
      </DialogContent>
    </Dialog>;
};