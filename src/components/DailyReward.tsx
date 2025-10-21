import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedCard } from "@/components/AnimatedCard";
import { Gift, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

interface DailyRewardProps {
  userId: string;
}

export const DailyReward = ({ userId }: DailyRewardProps) => {
  const [canClaim, setCanClaim] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();
  const { toast } = useToast();

  useEffect(() => {
    checkDailyReward();
  }, [userId]);

  const checkDailyReward = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('last_daily_reward')
      .eq('user_id', userId)
      .single();

    if (data) {
      const lastClaim = data.last_daily_reward ? new Date(data.last_daily_reward) : null;
      const now = new Date();
      const canClaimNow = !lastClaim || 
        (now.getTime() - lastClaim.getTime()) > 24 * 60 * 60 * 1000;
      setCanClaim(canClaimNow);
    }
  };

  const claimReward = async () => {
    setLoading(true);
    try {
      // Award coins
      const { error: coinsError } = await supabase.rpc('award_coins', {
        _user_id: userId,
        _amount: 10,
        _type: 'daily_login',
        _description: 'Daily login reward'
      });

      if (coinsError) throw coinsError;

      // Update last claim timestamp
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ last_daily_reward: new Date().toISOString() })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      toast({
        title: t.reward_claimed,
        description: t.reward_claimed_desc,
      });

      setCanClaim(false);
    } catch (error) {
      console.error('Error claiming reward:', error);
      toast({
        title: t.common_error,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!canClaim) return null;

  return (
    <AnimatedCard 
      className="p-4 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/30"
      hover="lift"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-amber-500/20">
            <Gift className="w-5 h-5 text-amber-500 animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{t.reward_daily_title}</h3>
            <p className="text-xs text-muted-foreground">{t.reward_daily_desc}</p>
          </div>
        </div>
        <Button 
          onClick={claimReward}
          disabled={loading}
          size="sm"
          className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600"
        >
          <Coins className="w-4 h-4 mr-1" />
          {t.reward_claim}
        </Button>
      </div>
    </AnimatedCard>
  );
};
