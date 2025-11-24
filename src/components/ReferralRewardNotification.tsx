import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Coins } from "lucide-react";

interface ReferralRewardNotificationProps {
  userId: string;
}

export const ReferralRewardNotification = ({ userId }: ReferralRewardNotificationProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    // Listen for new coin transactions related to referrals
    const channel = supabase
      .channel('referral-rewards')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'coin_transactions',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          const transaction = payload.new;
          
          // Check if it's a referral reward
          if (transaction.type === 'referral_reward' || transaction.type === 'referral_bonus') {
            toast({
              title: transaction.type === 'referral_reward' ? t.referral_reward_referrer : t.first_confession_bonus,
              description: `+${transaction.amount} coins`,
              duration: 5000,
              className: "bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, toast, t]);

  return null;
};
