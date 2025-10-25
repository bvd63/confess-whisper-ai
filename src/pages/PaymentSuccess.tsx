import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Crown, Sparkles, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import confetti from "canvas-confetti";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { user } = useCurrentUser();
  const { subscriptionTier, refetch } = usePremiumStatus(user?.id);
  const [isProcessing, setIsProcessing] = useState(true);
  const [processingMessage, setProcessingMessage] = useState<string>('');
  const [activatedTier, setActivatedTier] = useState<'vip' | null>(null);

  useEffect(() => {
    const pollBillingConfirmation = async () => {
      if (!user) return;

      const sessionId = searchParams.get('session_id');
      if (!sessionId) {
        setIsProcessing(false);
        return;
      }

      setProcessingMessage(t.payment_processing_wait);

      let attempts = 0;
      const maxAttempts = 5;

      const poll = async (): Promise<boolean> => {
        try {
          const { data, error } = await supabase.functions.invoke('billing-confirm', {
            body: { session_id: sessionId }
          });

          if (error) {
            console.error('Billing confirmation error:', error);
            return false;
          }

          // If still processing, wait and try again
          if (data?.processing) {
            attempts++;
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 2500));
              return poll();
            }
            return false;
          }

          // If active, entitlements are confirmed
          if (data?.active && data?.tier) {
            setActivatedTier(data.tier);
            await refetch();
            
            // Trigger confetti celebration
            confetti({
              particleCount: 150,
              spread: 100,
              origin: { y: 0.6 }
            });
            
            // Award coins bonus for first charge
            const { data: coinsData, error: coinsError } = await supabase.functions.invoke('award-subscription-coins', {
              body: { 
                userId: user.id, 
                tier: data.tier,
                isFirstCharge: true 
              }
            });

            if (!coinsError && coinsData?.awarded) {
              toast({
                title: t.coins_bonus_vip,
                description: `You received ${coinsData.amount} coins as a welcome bonus!`,
              });
            }

            toast({
              title: "Subscription Activated!",
              description: `Your VIP benefits are now active. Redirecting...`,
            });
            return true;
          }

          return false;
        } catch (error) {
          console.error('Error polling confirmation:', error);
          return false;
        }
      };

      const success = await poll();
      setIsProcessing(false);

      if (!success) {
        toast({
          title: "Processing...",
          description: "Your payment is being processed. Benefits will activate shortly.",
          variant: "default",
        });
      }

      // Auto-redirect after 5 seconds
      setTimeout(() => {
        navigate("/profile");
      }, 5000);
    };

    pollBillingConfirmation();
  }, [user, searchParams, navigate, toast, t, refetch]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center bg-gradient-to-br from-card to-primary/5 border-primary/30 shadow-[var(--shadow-glow)]">
        <div className="mb-6 animate-bounce-subtle">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-[var(--shadow-glow)]">
            {isProcessing ? (
              <Loader2 className="w-10 h-10 text-primary-foreground animate-spin" />
            ) : (
              <CheckCircle className="w-10 h-10 text-primary-foreground" />
            )}
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          {isProcessing ? "Processing Payment..." : t.payment_success_title}
        </h1>

        <p className="text-muted-foreground mb-6">
          {isProcessing ? processingMessage : `Your VIP account has been successfully activated.`}
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
          View Your VIP Profile
        </Button>

        <p className="text-xs text-muted-foreground mt-4">
          {t.payment_redirecting}
        </p>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
