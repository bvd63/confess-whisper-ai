import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CoinPurchaseCancel() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 bg-card p-8 rounded-2xl shadow-xl border-2">
        <div className="flex justify-center">
          <XCircle className="w-24 h-24 text-orange-500" />
        </div>
        
        <h1 className="text-3xl font-bold">
          {t.coins_purchase_cancelled_title || 'Purchase Cancelled'}
        </h1>
        
        <p className="text-muted-foreground">
          {t.coins_purchase_cancelled_message || 'Your purchase was cancelled. No charges were made to your account.'}
        </p>

        <div className="space-y-3">
          <Button
            onClick={() => navigate('/')}
            className="w-full"
            size="lg"
          >
            {t.coins_go_home || 'Go to Home'}
          </Button>
          
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="w-full"
            size="lg"
          >
            {t.coins_try_again || 'Try Again'}
          </Button>
        </div>
      </div>
    </div>
  );
}
