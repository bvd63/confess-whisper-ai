import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Crown, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { user } = useCurrentUser();
  const { subscriptionTier } = usePremiumStatus(user?.id);

  useEffect(() => {
    const processPayment = async () => {
      if (!user) return;

      try {
        // Check subscription status
        await supabase.functions.invoke('billing-status');
        
        // Award coins bonus for first charge
        const sessionId = searchParams.get('session_id');
        if (sessionId && subscriptionTier && subscriptionTier !== 'free') {
          const { data, error } = await supabase.functions.invoke('award-subscription-coins', {
            body: { 
              userId: user.id, 
              tier: subscriptionTier,
              isFirstCharge: true 
            }
          });

          if (!error && data?.awarded) {
            toast({
              title: t.coins_bonus_premium,
              description: `You received ${data.amount} coins as a welcome bonus!`,
            });
          }
        }

        toast({
          title: "Subscription Activated!",
          description: "Your Premium benefits are now active",
        });
      } catch (error) {
        console.error('Error processing payment:', error);
      }
    };

    processPayment();

    // Auto-redirect after 5 seconds
    const timer = setTimeout(() => {
      navigate("/profile");
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate, toast, user, subscriptionTier, searchParams, t]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center bg-gradient-to-br from-card to-primary/5 border-primary/30 shadow-[var(--shadow-glow)]">
        <div className="mb-6 animate-bounce-subtle">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-[var(--shadow-glow)]">
            <CheckCircle className="w-10 h-10 text-primary-foreground" />
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          {t.payment_success_title}
        </h1>

        <p className="text-muted-foreground mb-6">
          {t.payment_success_desc}
        </p>

        <div className="space-y-3 mb-8">
          <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <Crown className="w-5 h-5 text-primary" />
            <span className="text-sm text-foreground">{t.payment_success_deep_insights}</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm text-foreground">{t.payment_success_analysis}</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <CheckCircle className="w-5 h-5 text-primary" />
            <span className="text-sm text-foreground">{t.payment_success_priority}</span>
          </div>
        </div>

        <Button
          onClick={() => navigate("/profile")}
          className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
        >
          {t.payment_view_profile}
        </Button>

        <p className="text-xs text-muted-foreground mt-4">
          {t.payment_redirecting}
        </p>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
