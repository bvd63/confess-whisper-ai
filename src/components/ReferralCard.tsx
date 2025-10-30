import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, Copy, Users, CheckCircle, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

const ReferralCard = () => {
  const [referralCode, setReferralCode] = useState<string>("");
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('referral_code, total_referrals')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (!profile?.referral_code) {
        // Generate referral code
        const code = `CONF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ referral_code: code })
          .eq('user_id', user.id);

        if (!updateError) {
          setReferralCode(code);
        }
      } else {
        setReferralCode(profile.referral_code);
        setTotalReferrals(profile.total_referrals || 0);
      }
    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}/?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    
    toast({
      title: t.referral_link_copied,
      description: t.referral_description,
    });
  };

  const shareOnSocial = (platform: 'facebook' | 'twitter' | 'whatsapp') => {
    const link = `${window.location.origin}/?ref=${referralCode}`;
    const text = t.referral_share_message;
    
    let url = '';
    switch (platform) {
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
        break;
      case 'whatsapp':
        url = `https://wa.me/?text=${encodeURIComponent(text + ' ' + link)}`;
        break;
    }

    if (url) {
      window.open(url, '_blank', 'width=600,height=400');
    }
  };

  if (isLoading) {
    return (
      <Card className="p-4 sm:p-5 animate-pulse">
        <div className="h-20 bg-muted rounded" />
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-5 bg-gradient-to-br from-card to-primary/5 border-primary/20 shadow-[var(--shadow-soft)]">
      <div className="flex items-start gap-3">
        <div className="p-2 sm:p-2.5 rounded-full bg-primary/20 flex-shrink-0">
          <Gift className="w-5 h-5 text-primary" />
        </div>
        
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="text-base sm:text-lg font-semibold mb-1">{t.referral_title}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t.referral_description}
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span className="font-medium">{totalReferrals} {t.referral_friends_invited}</span>
          </div>

          {/* Referral Link */}
          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-medium">{t.referral_link_label}</label>
            <div className="flex gap-1.5 sm:gap-2">
              <Input
                value={`${window.location.origin}/?ref=${referralCode}`}
                readOnly
                className="text-xs sm:text-sm h-8 sm:h-9"
              />
              <Button
                onClick={copyReferralLink}
                size="icon"
                variant="outline"
                className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Social Share Buttons */}
          <div className="flex gap-1.5 sm:gap-2">
            <Button
              onClick={() => shareOnSocial('facebook')}
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-8"
            >
              Facebook
            </Button>
            <Button
              onClick={() => shareOnSocial('twitter')}
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-8"
            >
              Twitter
            </Button>
            <Button
              onClick={() => shareOnSocial('whatsapp')}
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-8"
            >
              WhatsApp
            </Button>
          </div>

          {/* Reward Info */}
          <div className="space-y-1.5 p-2 sm:p-2.5 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/20">
            <div className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-yellow-600" />
              <p className="font-semibold text-xs sm:text-sm">{t.referral_title}</p>
            </div>
            <ul className="space-y-1 text-[10px] sm:text-xs text-muted-foreground">
              <li className="flex items-start gap-1.5">
                <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>{t.referral_reward_referrer}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>{t.referral_reward_referred}</span>
              </li>
            </ul>
          </div>

          {/* Success Message */}
          {totalReferrals > 0 && (
            <div className="flex items-start gap-1.5 sm:gap-2 p-2 sm:p-2.5 bg-primary/10 rounded-lg">
              <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm">
                <p className="font-medium text-primary">
                  {totalReferrals} {t.referral_friends_invited}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                  {t.referral_continue_inviting}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ReferralCard;