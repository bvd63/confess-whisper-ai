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
import { logError } from "@/lib/logger";

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

  // Epic confetti celebration on success
  useEffect(() => {
    if (!isProcessing && activatedTier === 'vip') {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval = window.setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ['#a855f7', '#9333ea', '#7e22ce']
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ['#a855f7', '#9333ea', '#7e22ce']
        });
      }, 250);
      
      // Auto redirect after 4 seconds
      const timer = setTimeout(() => {
        navigate('/profile');
      }, 4000);
      
      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    }
  }, [isProcessing, activatedTier, navigate]);

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
            logError('Billing confirmation error', error as Error);
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
          logError('Error polling confirmation', error as Error);
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
      <Card className="max-w-md w-full p-4 sm:p-6 text-center bg-gradient-to-br from-card to-primary/5 border-primary/30 shadow-[var(--shadow-glow)]">
        <div className="mb-4 sm:mb-5 animate-bounce-subtle">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-[var(--shadow-glow)]">
            {isProcessing ? (
              <Loader2 className="w-8 h-8 sm:w-9 sm:h-9 text-primary-foreground animate-spin" />
            ) : (
              <CheckCircle className="w-8 h-8 sm:w-9 sm:h-9 text-primary-foreground" />
            )}
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          {isProcessing ? "Processing Payment..." : t.payment_success_title}
        </h1>

        <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
          {isProcessing ? processingMessage : `Your VIP account has been successfully activated.`}
        </p>

        <div className="space-y-2 sm:space-y-2.5 mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 bg-primary/10 rounded-lg border border-primary/20">
            <Crown className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-xs sm:text-sm text-foreground">{t.payment_success_deep_insights}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 bg-primary/10 rounded-lg border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-xs sm:text-sm text-foreground">{t.payment_success_analysis}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 bg-primary/10 rounded-lg border border-primary/20">
            <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-xs sm:text-sm text-foreground">{t.payment_success_priority}</span>
          </div>
        </div>

        <Button
          onClick={() => navigate("/profile")}
          className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 h-9 sm:h-10 text-sm"
        >
          View Your VIP Profile
        </Button>

        <p className="text-xs text-muted-foreground mt-3 sm:mt-4">
          {t.payment_redirecting}
        </p>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
