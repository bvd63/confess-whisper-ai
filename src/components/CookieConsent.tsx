import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Cookie, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const COOKIE_CONSENT_KEY = "cookie-consent";

/**
 * Cookie consent banner for GDPR compliance
 */
export const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    
    if (!consent) {
      setShowBanner(true);
      // Delay for smooth animation
      setTimeout(() => setIsVisible(true), 100);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    handleClose();
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "declined");
    handleClose();
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => setShowBanner(false), 300);
  };

  if (!showBanner) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6",
        "safe-area-inset-bottom",
        "transition-all duration-300",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
      )}
    >
      <Card className="max-w-2xl mx-auto p-4 sm:p-6 shadow-2xl border-primary/20 bg-card/95 backdrop-blur-lg">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="p-2 rounded-full bg-primary/10">
              <Cookie className="h-5 w-5 text-primary" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base sm:text-lg mb-2">
              {t.cookies_title}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t.cookies_description}
            </p>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Button
                onClick={handleAccept}
                size="sm"
                className="w-full sm:w-auto hover-lift"
              >
                {t.accept_all}
              </Button>
              <Button
                onClick={handleDecline}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto hover-scale"
              >
                {t.decline}
              </Button>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 h-8 w-8 -mt-1 -mr-1"
            onClick={handleClose}
            aria-label={t.ui_close}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
};
