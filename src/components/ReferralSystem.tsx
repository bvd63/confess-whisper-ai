import { useEffect, useState } from "react";
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

  useEffect(() => {
    loadReferralData();
  }, [userId]);

  const loadReferralData = async () => {
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
  };

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
    <Card className="p-6 rounded-3xl shadow-card border-border/50">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Gift className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-xl font-bold">{t.referral_program_title}</h3>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="text-center p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl shadow-ios border border-primary/20">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-2">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-primary mb-1">{completedCount}</p>
          <p className="text-xs font-semibold text-muted-foreground">{t.referral_completed}</p>
        </div>
        <div className="text-center p-4 bg-muted/30 rounded-2xl shadow-ios border border-border/50">
          <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-2">
            <Users className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mb-1">{pendingCount}</p>
          <p className="text-xs font-semibold text-muted-foreground">{t.referral_pending}</p>
        </div>
        <div className="text-center p-4 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 rounded-2xl shadow-ios border border-yellow-500/20">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center mx-auto mb-2">
            <Coins className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-yellow-600 mb-1">{totalRewards}</p>
          <p className="text-xs font-semibold text-muted-foreground">{t.referral_coins_earned}</p>
        </div>
      </div>

      {/* Referral Code */}
      <div className="space-y-3 mb-6">
        <label className="text-sm font-semibold text-foreground">{t.referral_your_code}</label>
        <div className="flex gap-2">
          <Input
            value={referralCode}
            readOnly
            className="font-mono text-center text-lg font-bold h-12 rounded-xl border-border/50 shadow-ios bg-muted/30"
          />
          <Button
            onClick={copyReferralLink}
            variant="outline"
            size="icon"
            className="flex-shrink-0 h-12 w-12 rounded-xl shadow-ios hover:shadow-elevated border-border/50"
          >
            {copied ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : (
              <Copy className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Benefits */}
      <div className="p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-2xl border border-yellow-500/20 shadow-ios">
        <p className="text-sm font-bold mb-3 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-yellow-500/20 flex items-center justify-center">
            <Coins className="w-4 h-4 text-yellow-600" />
          </div>
          {t.referral_benefits}
        </p>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li className="flex items-start gap-3">
            <span className="text-yellow-600 font-bold">🪙</span>
            <span>{t.referral_reward_referrer}</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-yellow-600 font-bold">🪙</span>
            <span>{t.referral_reward_referred}</span>
          </li>
        </ul>
      </div>
    </Card>
  );
};

export default ReferralSystem;
