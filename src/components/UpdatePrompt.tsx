import { useState, useEffect } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Notifies users when an update is available
 */
export const UpdatePrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    // Check for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New version available
                  setShowPrompt(true);
                  setTimeout(() => setIsVisible(true), 100);
                }
              });
            }
          });
        }
      });
    }

    // Check for version updates via periodic polling (fallback)
    const checkForUpdates = async () => {
      try {
        const response = await fetch('/version.json', {
          cache: 'no-cache',
        });
        
        if (response.ok) {
          const { version } = await response.json();
          const currentVersion = localStorage.getItem('app-version');
          
          if (currentVersion && currentVersion !== version) {
            setShowPrompt(true);
            setTimeout(() => setIsVisible(true), 100);
          }
          
          localStorage.setItem('app-version', version);
        }
      } catch (error) {
        // Silently fail - version checking is not critical
        console.debug('Version check failed:', error);
      }
    };

    // Check on mount and every 30 minutes
    checkForUpdates();
    const interval = setInterval(checkForUpdates, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => setShowPrompt(false), 300);
  };

  if (!showPrompt) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50",
        "transition-all duration-300",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      )}
    >
      <Card className="p-4 shadow-lg max-w-sm bg-card border-primary/20">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">
              {t.update_available_title}
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              {t.update_available_description}
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleRefresh}
                className="flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                {t.refresh_now}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
              >
                {t.later}
              </Button>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 -mt-1 -mr-1"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
};
