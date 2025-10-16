import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, Users, Copy, Check, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

    // Calculate rewards
    const completedReferrals = referralsData?.filter(r => r.status === 'completed').length || 0;
    setTotalRewards(completedReferrals * 100); // 100 coins per completed referral
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}/?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    toast({
      title: "Link copiat!",
      description: "Link-ul de recomandare a fost copiat în clipboard",
    });
  };

  const completedCount = referrals.filter(r => r.status === 'completed').length;
  const pendingCount = referrals.filter(r => r.status === 'pending').length;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Gift className="w-6 h-6 text-primary" />
        <h3 className="text-lg font-semibold">Program de recomandare</h3>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-primary/10 rounded-lg">
          <Users className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold text-primary">{completedCount}</p>
          <p className="text-xs text-muted-foreground">Completate</p>
        </div>
        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <Users className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-2xl font-bold">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">În așteptare</p>
        </div>
        <div className="text-center p-4 bg-yellow-500/10 rounded-lg">
          <Coins className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-yellow-600">{totalRewards}</p>
          <p className="text-xs text-muted-foreground">Monede câștigate</p>
        </div>
      </div>

      {/* Referral Code */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Codul tău de recomandare</label>
        <div className="flex gap-2">
          <Input
            value={referralCode}
            readOnly
            className="font-mono text-center text-lg font-bold"
          />
          <Button
            onClick={copyReferralLink}
            variant="outline"
            size="icon"
            className="flex-shrink-0"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Benefits */}
      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <p className="text-sm font-semibold mb-2">{t.referral_benefits}</p>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>{t.referral_benefit_coins}</li>
          <li>{t.referral_benefit_friend}</li>
          <li>{t.referral_benefit_badge}</li>
        </ul>
      </div>
    </Card>
  );
};

export default ReferralSystem;
