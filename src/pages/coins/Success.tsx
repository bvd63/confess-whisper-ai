import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { useQueryClient } from '@tanstack/react-query';
import { logDebug, logError } from '@/lib/logger';

export default function CoinPurchaseSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const sessionId = searchParams.get('session_id');
  const [verifying, setVerifying] = useState(true);
  const [coinsAwarded, setCoinsAwarded] = useState<number | null>(null);

  useEffect(() => {
    const verifyPurchase = async () => {
      if (!sessionId) {
        setVerifying(false);
        return;
      }

      try {
        logDebug('[SUCCESS PAGE] Verifying purchase for session', { sessionId });
        
        const { data, error } = await supabase.functions.invoke('verify-coin-purchase', {
          body: { sessionId }
        });

        if (error) {
          logError('[SUCCESS PAGE] Verification error', error);
          toast.error('Failed to verify purchase');
        } else if (data?.success) {
          logDebug('[SUCCESS PAGE] Verification result', { data });
          if (data.already_awarded) {
            logDebug('[SUCCESS PAGE] Coins were already awarded');
          } else {
            logDebug('[SUCCESS PAGE] Coins awarded', { coins_awarded: data.coins_awarded });
            setCoinsAwarded(data.coins_awarded);
          }
          
          // Force refetch user_coins to trigger realtime update
          await supabase
            .from('user_coins')
            .select('balance')
            .single();
          
          // Invalidate React Query cache for coin balance
          queryClient.invalidateQueries({ queryKey: ['coin-balance'] });
          queryClient.invalidateQueries({ queryKey: ['coinBalance'] });
        }
      } catch (err) {
        logError('[SUCCESS PAGE] Verification failed', err as Error);
      } finally {
        setVerifying(false);
      }
    };

    verifyPurchase();
  }, [queryClient, sessionId]);

  useEffect(() => {
    if (!verifying) {
      // Trigger confetti celebration
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      // Trigger multiple bursts
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
      }, 250);
      
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 400);
    }
  }, [verifying]);

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
        <div className="max-w-md w-full text-center space-y-6 bg-card p-8 rounded-2xl shadow-xl border-2 border-yellow-500/50">
          <Loader2 className="w-16 h-16 animate-spin text-yellow-500 mx-auto" />
          <h2 className="text-xl font-semibold">Verifying purchase...</h2>
          <p className="text-muted-foreground">Please wait while we confirm your coins</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
      <div className="max-w-md w-full text-center space-y-6 bg-card p-8 rounded-2xl shadow-xl border-2 border-yellow-500/50">
        <div className="flex justify-center">
          <div className="relative">
            <CheckCircle className="w-24 h-24 text-green-500 animate-bounce" />
            <div className="absolute inset-0 w-24 h-24 bg-green-500/20 rounded-full animate-ping" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
          {t.coins_purchase_success_title || '🎉 Purchase Successful!'}
        </h1>
        
        {coinsAwarded && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
            <p className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">
              +{coinsAwarded} coins added to your account! 🪙
            </p>
          </div>
        )}
        
        <p className="text-muted-foreground">
          {t.coins_purchase_success_message || 'Your coins have been added to your account. You can now use them to unlock VIP features!'}
        </p>

        <div className="space-y-3">
          <Button
            onClick={() => navigate('/')}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
            size="lg"
          >
            {t.coins_go_home || 'Go to Home'}
          </Button>
          
          <Button
            onClick={() => navigate('/profile')}
            variant="outline"
            className="w-full"
            size="lg"
          >
            {t.coins_visit_store || 'View Profile'}
          </Button>
        </div>

        {sessionId && (
          <p className="text-xs text-muted-foreground pt-4 border-t">
            Order ID: {sessionId.slice(0, 20)}...
          </p>
        )}
      </div>
    </div>
  );
}
