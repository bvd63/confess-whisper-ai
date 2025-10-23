import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface SensitiveContentWarningProps {
  children: React.ReactNode;
  isSensitive: boolean;
}

export const SensitiveContentWarning = ({ children, isSensitive }: SensitiveContentWarningProps) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const { t } = useLanguage();

  if (!isSensitive || isRevealed) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="blur-lg select-none pointer-events-none">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm p-4 rounded-lg">
        <AlertTriangle className="h-8 w-8 text-warning mb-3" />
        <p className="text-sm font-medium text-center mb-2">
          {t.sensitive_content_warning}
        </p>
        <p className="text-xs text-muted-foreground text-center mb-4">
          {t.sensitive_content_description}
        </p>
        <Button
          onClick={() => setIsRevealed(true)}
          variant="outline"
          size="sm"
        >
          {t.sensitive_content_view}
        </Button>
      </div>
    </div>
  );
};
