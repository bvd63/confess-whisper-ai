import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles, X } from "lucide-react";
import { VIPFeatureComparison } from "./VIPFeatureComparison";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { logInfo, logError } from "@/lib/logger";

interface OnboardingTranslations {
  title: string;
  subtitle: string;
  description: string;
  startTrial: string;
  activating: string;
  continueFree: string;
  trialNote: string;
  trialBadge: string;
  successTitle: string;
  successDesc: string;
  errorAlreadyUsed: string;
  errorAlreadyUsedDesc: string;
  errorActivation: string;
  errorActivationDesc: string;
}

const translations: Record<string, OnboardingTranslations> = {
  en: {
    title: "Welcome to ConfessAI",
    subtitle: "Experience VIP Features Risk-Free",
    description: "Unlock unlimited confessions, exclusive badges, and priority support. No credit card required.",
    startTrial: "Start Free Trial",
    activating: "Activating...",
    continueFree: "Continue with Free",
    trialNote: "Your trial will automatically convert to the free plan after 7 days. You can upgrade to VIP anytime.",
    trialBadge: "7-Day Free Trial",
    successTitle: "Welcome to VIP! 🎉",
    successDesc: "Your 7-day free trial is now active. Enjoy all VIP features!",
    errorAlreadyUsed: "Trial Already Used",
    errorAlreadyUsedDesc: "You've already used your free trial. Upgrade to VIP for full access.",
    errorActivation: "Activation Failed",
    errorActivationDesc: "Something went wrong. Please try again later.",
  },
  es: {
    title: "Bienvenido a ConfessAI",
    subtitle: "Experimenta las funciones VIP sin riesgo",
    description: "Desbloquea confesiones ilimitadas, insignias exclusivas y soporte prioritario. Sin tarjeta de crédito.",
    startTrial: "Comenzar prueba gratuita",
    activating: "Activando...",
    continueFree: "Continuar gratis",
    trialNote: "Tu prueba se convertirá automáticamente al plan gratuito después de 7 días. Puedes actualizar a VIP en cualquier momento.",
    trialBadge: "Prueba gratuita de 7 días",
    successTitle: "¡Bienvenido a VIP! 🎉",
    successDesc: "Tu prueba gratuita de 7 días está activa. ¡Disfruta de todas las funciones VIP!",
    errorAlreadyUsed: "Prueba ya usada",
    errorAlreadyUsedDesc: "Ya has usado tu prueba gratuita. Actualiza a VIP para acceso completo.",
    errorActivation: "Activación fallida",
    errorActivationDesc: "Algo salió mal. Por favor, inténtalo más tarde.",
  },
  de: {
    title: "Willkommen bei ConfessAI",
    subtitle: "Erlebe VIP-Funktionen risikofrei",
    description: "Unbegrenzte Geständnisse, exklusive Abzeichen und prioritären Support freischalten. Keine Kreditkarte erforderlich.",
    startTrial: "Kostenlose Testversion starten",
    activating: "Wird aktiviert...",
    continueFree: "Kostenlos fortfahren",
    trialNote: "Deine Testversion wird nach 7 Tagen automatisch in den kostenlosen Plan umgewandelt. Du kannst jederzeit auf VIP upgraden.",
    trialBadge: "7-Tage kostenlose Testversion",
    successTitle: "Willkommen bei VIP! 🎉",
    successDesc: "Deine 7-Tage-Testversion ist jetzt aktiv. Genieße alle VIP-Funktionen!",
    errorAlreadyUsed: "Testversion bereits genutzt",
    errorAlreadyUsedDesc: "Du hast deine kostenlose Testversion bereits genutzt. Upgrade auf VIP für vollen Zugriff.",
    errorActivation: "Aktivierung fehlgeschlagen",
    errorActivationDesc: "Etwas ist schiefgelaufen. Bitte versuche es später erneut.",
  },
};

interface VIPOnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTrialActivated?: () => void;
}

export const VIPOnboardingModal = ({ 
  open, 
  onOpenChange, 
  onTrialActivated 
}: VIPOnboardingModalProps) => {
  const [isActivating, setIsActivating] = useState(false);
  const navigate = useNavigate();
  const lang = (navigator.language || 'en').slice(0, 2);
  const t = translations[lang] || translations.en;

  const handleActivateTrial = async () => {
    setIsActivating(true);
    logInfo("Activating VIP trial");

    try {
      const { data, error } = await supabase.functions.invoke("activate-trial");

      if (error) {
        logError("Trial activation failed", { error });
        throw error;
      }

      if (!data.success) {
        if (data.error === "trial_already_used") {
          toast.error(t.errorAlreadyUsed, {
            description: t.errorAlreadyUsedDesc,
          });
        } else {
          toast.error(t.errorActivation, {
            description: data.message || t.errorActivationDesc,
          });
        }
        return;
      }

      logInfo("Trial activated successfully", { trialEndsAt: data.trial_ends_at });

      toast.success(t.successTitle, {
        description: t.successDesc,
        duration: 5000,
      });

      onOpenChange(false);
      onTrialActivated?.();

      // Refresh page to update subscription state
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      logError("Trial activation error", { error });
      toast.error(t.errorActivation, {
        description: t.errorActivationDesc,
      });
    } finally {
      setIsActivating(false);
    }
  };

  const handleSkip = () => {
    logInfo("User skipped onboarding");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[20px] border-border/50">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2.5 text-2xl font-bold">
              <Crown className="w-7 h-7 text-[#B266FF] dark:text-[#B266FF]" />
              {t.title}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              className="h-10 w-10 rounded-full hover:bg-secondary"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#B266FF]/10 dark:bg-[#B266FF]/20 text-[#9C27FF] dark:text-[#B266FF] text-sm font-semibold border border-[#B266FF]/20">
              <Sparkles className="w-4 h-4" />
              {t.trialBadge}
            </div>
            <h3 className="text-xl font-bold text-foreground px-4">
              {t.subtitle}
            </h3>
            <p className="text-base text-muted-foreground px-6 leading-relaxed">
              {t.description}
            </p>
          </div>

          <VIPFeatureComparison lang={lang} />

          <div className="flex flex-col sm:flex-row gap-3 pt-6">
            <Button
              size="lg"
              className="flex-1 gap-2 font-semibold rounded-full h-14 bg-gradient-to-r from-[#9C27FF] to-[#B266FF] hover:from-[#8B20E7] hover:to-[#A855F7] text-white shadow-lg shadow-[#9C27FF]/25"
              onClick={handleActivateTrial}
              disabled={isActivating}
            >
              {isActivating ? (
                <>
                  <span className="animate-spin text-lg">⏳</span>
                  {t.activating}
                </>
              ) : (
                <>
                  <Crown className="w-5 h-5" />
                  {t.startTrial}
                </>
              )}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex-1 rounded-full h-14 border-border hover:bg-secondary"
              onClick={handleSkip}
            >
              {t.continueFree}
            </Button>
          </div>

          <p className="text-sm text-center text-muted-foreground px-8 leading-relaxed">
            {t.trialNote}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
