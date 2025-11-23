import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface RateLimitNotificationProps {
  onClose: () => void;
}

const RateLimitNotification = ({ onClose }: RateLimitNotificationProps) => {
  const { t } = useLanguage();
  
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-slide-up">
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-destructive mb-1">
              {t.rate_limit_title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t.rate_limit_desc}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 hover:bg-destructive/20"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RateLimitNotification;
