import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import confetti from 'canvas-confetti';

export default function CoinPurchaseSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
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
  }, []);

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
        
        <p className="text-muted-foreground">
          {t.coins_purchase_success_message || 'Your coins have been added to your account. You can now use them to unlock premium features!'}
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
