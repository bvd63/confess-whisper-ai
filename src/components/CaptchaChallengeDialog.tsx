import { useState } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EnhancedButton } from '@/components/EnhancedButton';
import { useLanguage } from '@/contexts/LanguageContext';

interface CaptchaChallengeDialogProps {
  open: boolean;
  title?: string;
  message?: string;
  reason?: string | null;
  onResolve: (token: string) => void;
  onCancel: () => void;
}

export const CaptchaChallengeDialog = ({
  open,
  title,
  message,
  reason,
  onResolve,
  onCancel,
}: CaptchaChallengeDialogProps) => {
  const { t } = useLanguage();
  const [turnstileError, setTurnstileError] = useState<string | null>(null);

  const resolvedTitle = title ?? t.auth_captcha_refresh_title ?? 'Additional verification required';
  const resolvedMessage = message ?? t.auth_captcha_refresh_desc ?? 'We detected unusual activity. Complete this verification to stay signed in.';

  const handleDismiss = () => {
    setTurnstileError(null);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) handleDismiss(); }}>
      <DialogContent className="max-w-md space-y-4">
        <DialogHeader>
          <DialogTitle>{resolvedTitle}</DialogTitle>
          <DialogDescription>
            {resolvedMessage}
            {reason ? ` (${reason})` : ''}
          </DialogDescription>
        </DialogHeader>

        {turnstileError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{turnstileError}</AlertDescription>
          </Alert>
        )}

        <div className="rounded-lg border border-border/60 bg-background/80 p-4">
          <Turnstile
            siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
            onSuccess={(token) => {
              setTurnstileError(null);
              onResolve(token);
            }}
            onError={() => {
              setTurnstileError(t.auth_captcha_failed);
            }}
            onExpire={() => {
              setTurnstileError(t.auth_captcha_failed);
            }}
            options={{
              theme: 'auto',
              size: 'normal',
            }}
          />
        </div>

        <EnhancedButton variant="outline" onClick={handleDismiss} className="w-full">
          {t.cancel}
        </EnhancedButton>
      </DialogContent>
    </Dialog>
  );
};
