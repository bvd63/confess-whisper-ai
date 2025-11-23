import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, Users, Copy, Check, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface ReferralSystemProps {
  userId: string;
}

interface Referral {
  id: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

const ReferralSystem = ({ userId }: ReferralSystemProps) => {
  const [referralCode, setReferralCode] = useState<string>("");
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [totalRewards, setTotalRewards] = useState(0);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const loadReferralData = useCallback(async () => {
    // Load referral code from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('user_id', userId)
      .single();

    if (profile?.referral_code) {
      setReferralCode(profile.referral_code);
    } else {
      // Generate new referral code
      const newCode = `REF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      await supabase
        .from('profiles')
        .update({ referral_code: newCode })
        .eq('user_id', userId);
      setReferralCode(newCode);
    }

    // Load referrals
    const { data: referralsData } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_user_id', userId)
      .order('created_at', { ascending: false });

    setReferrals(referralsData || []);

    // Calculate rewards (20 coins per completed referral)
    const completedReferrals = referralsData?.filter(r => r.status === 'completed').length || 0;
    setTotalRewards(completedReferrals * 20);
  }, [userId]);

  useEffect(() => {
    loadReferralData();
  }, [loadReferralData]);

  const copyReferralLink = () => {
    const link = `${window.location.origin}/?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    toast({
      title: t.referral_link_copied_toast,
      description: t.referral_link_copied_desc,
    });
  };

  const completedCount = referrals.filter(r => r.status === 'completed').length;
  const pendingCount = referrals.filter(r => r.status === 'pending').length;

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-1.5 sm:gap-2 mb-4 sm:mb-5">
        <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
        <h3 className="text-base sm:text-lg font-semibold">{t.referral_program_title}</h3>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-5">
        <div className="text-center p-2.5 sm:p-3 bg-primary/10 rounded-lg">
          <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary mx-auto mb-1 sm:mb-1.5" />
          <p className="text-lg sm:text-xl font-bold text-primary">{completedCount}</p>
          <p className="text-[9px] sm:text-xs text-muted-foreground">{t.referral_completed}</p>
        </div>
        <div className="text-center p-2.5 sm:p-3 bg-muted/50 rounded-lg">
          <Users className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground mx-auto mb-1 sm:mb-1.5" />
          <p className="text-lg sm:text-xl font-bold">{pendingCount}</p>
          <p className="text-[9px] sm:text-xs text-muted-foreground">{t.referral_pending}</p>
        </div>
        <div className="text-center p-2.5 sm:p-3 bg-yellow-500/10 rounded-lg">
          <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 mx-auto mb-1 sm:mb-1.5" />
          <p className="text-lg sm:text-xl font-bold text-yellow-600">{totalRewards}</p>
          <p className="text-[9px] sm:text-xs text-muted-foreground">{t.referral_coins_earned}</p>
        </div>
      </div>

      {/* Referral Code */}
      <div className="space-y-2 sm:space-y-2.5">
        <label className="text-xs sm:text-sm font-medium">{t.referral_your_code}</label>
        <div className="flex gap-1.5 sm:gap-2">
          <Input
            value={referralCode}
            readOnly
            className="font-mono text-center text-base sm:text-lg font-bold h-9 sm:h-10"
          />
          <Button
            onClick={copyReferralLink}
            variant="outline"
            size="icon"
            className="flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Benefits */}
      <div className="mt-4 sm:mt-5 p-3 sm:p-3.5 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/20">
        <p className="text-xs sm:text-sm font-semibold mb-2 sm:mb-2.5 flex items-center gap-1.5 sm:gap-2">
          <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-600" />
          {t.referral_benefits}
        </p>
        <ul className="text-[10px] sm:text-xs text-muted-foreground space-y-1 sm:space-y-1.5">
          <li className="flex items-start gap-1.5 sm:gap-2">
            <span className="text-yellow-600">•</span>
            <span>{t.referral_reward_referrer}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-600">•</span>
            <span>{t.referral_reward_referred}</span>
          </li>
        </ul>
      </div>
    </Card>
  );
};

export default ReferralSystem;
