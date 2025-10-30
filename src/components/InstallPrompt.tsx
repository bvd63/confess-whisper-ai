import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPrompt = () => {
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after 30 seconds if not dismissed
      setTimeout(() => {
        const dismissed = localStorage.getItem('pwa-prompt-dismissed');
        if (!dismissed) {
          setShowPrompt(true);
        }
      }, 30000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (!showPrompt || !deferredPrompt) return null;

  return (
    <Card className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 p-3 sm:p-3.5 shadow-elegant glass-strong animate-slide-up z-50">
      <button
        onClick={handleDismiss}
        className="absolute top-1.5 right-1.5 p-1 hover:bg-muted rounded-full transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      
      <div className="flex items-start gap-2 sm:gap-2.5">
        <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg flex-shrink-0">
          <Download className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold mb-1 text-sm">
            {t.install_app || "Install App"}
          </h3>
          <p className="text-xs text-muted-foreground mb-2.5">
            {t.install_app_description || "Add ConfessAI to your home screen for a better experience"}
          </p>
          <div className="flex gap-1.5 sm:gap-2">
            <Button onClick={handleInstall} size="sm" className="flex-1 h-8 text-xs">
              {t.install || "Install"}
            </Button>
            <Button onClick={handleDismiss} variant="outline" size="sm" className="h-8 text-xs">
              {t.not_now || "Not Now"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
