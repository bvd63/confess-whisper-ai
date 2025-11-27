import { useState, useEffect } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { logInfo, logDebug } from "@/lib/logger";

/**
 * Notifies users when an update is available
 */
export const UpdatePrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [autoReloadCountdown, setAutoReloadCountdown] = useState(0);
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

    // Check for version updates via periodic polling (more frequent)
    const checkForUpdates = async () => {
      try {
        const response = await fetch('/version.json?t=' + Date.now(), {
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
        });
        
        if (response.ok) {
          const { version } = await response.json();
          const currentVersion = localStorage.getItem('app-version');
          
          if (currentVersion && currentVersion !== version) {
            logInfo('🆕 New version available', { version, currentVersion });
            setShowPrompt(true);
            setTimeout(() => setIsVisible(true), 100);
          }
          
          localStorage.setItem('app-version', version);
        }
      } catch (error) {
        // Silently fail - version checking is not critical
        logDebug('Version check failed', { error });
      }
    };

    // Listen for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SW_UPDATED') {
          setShowPrompt(true);
          setTimeout(() => setIsVisible(true), 100);
        }
      });
    }

    // Check on mount, on page visibility change, and every 500ms for instant real-time updates
    checkForUpdates();
    const interval = setInterval(checkForUpdates, 500);

    // Check when user returns to tab
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkForUpdates();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleRefresh = () => {
    // Hard reload with cache bypass
    window.location.reload();
    
    // Additional cache clearing
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => setShowPrompt(false), 300);
  };

  // Instant auto-reload - no countdown, reload immediately
  useEffect(() => {
    if (!showPrompt) return;

    // Reload immediately when update is detected
    const immediateReload = setTimeout(() => {
      handleRefresh();
    }, 100);

    return () => clearTimeout(immediateReload);
  }, [showPrompt]);

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
            <p className="text-xs text-primary/80 font-medium mb-2">
              ✨ Reloading now for instant updates...
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
