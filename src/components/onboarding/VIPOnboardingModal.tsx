import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logInfo, logError } from "@/lib/logger";

interface OnboardingTranslations {
  title: string;
  subtitle: string;
  trialBadge: string;
  startTrial: string;
  activating: string;
  continueFree: string;
  successTitle: string;
  successDesc: string;
  errorAlreadyUsed: string;
  errorAlreadyUsedDesc: string;
  errorActivation: string;
  errorActivationDesc: string;
  colFree: string;
  colVip: string;
  rowConfessions: string;
  rowConfessionsFree: string;
  rowConfessionsVip: string;
  rowCoins: string;
  rowCoinsFree: string;
  rowCoinsVip: string;
  rowBadge: string;
  rowFlairs: string;
}

const translations: Record<string, OnboardingTranslations> = {
  en: {
    title: "Welcome to ConfessAI",
    subtitle: "Unlock VIP perks — no credit card required.",
    trialBadge: "3-Day Free Trial",
    startTrial: "Start Free Trial",
    activating: "Activating...",
    continueFree: "Continue with Free",
    successTitle: "Welcome to VIP! 🎉",
    successDesc: "Your 3-day free trial is now active. Enjoy all VIP features!",
    errorAlreadyUsed: "Trial Already Used",
    errorAlreadyUsedDesc: "You've already used your free trial. Upgrade to VIP for full access.",
    errorActivation: "Activation Failed",
    errorActivationDesc: "Something went wrong. Please try again later.",
    colFree: "Free",
    colVip: "VIP",
    rowConfessions: "Daily confessions",
    rowConfessionsFree: "5/day",
    rowConfessionsVip: "Unlimited",
    rowCoins: "250 Bonus Coins",
    rowCoinsFree: "—",
    rowCoinsVip: "250 coins\n(one-time)",
    rowBadge: "VIP Badge",
    rowFlairs: "Special Flairs",
  },
  es: {
    title: "Bienvenido a ConfessAI",
    subtitle: "Desbloquea ventajas VIP — sin tarjeta de crédito.",
    trialBadge: "Prueba gratuita de 3 días",
    startTrial: "Comenzar prueba gratuita",
    activating: "Activando...",
    continueFree: "Continuar gratis",
    successTitle: "¡Bienvenido a VIP! 🎉",
    successDesc: "Tu prueba gratuita de 3 días está activa. ¡Disfruta de todas las funciones VIP!",
    errorAlreadyUsed: "Prueba ya usada",
    errorAlreadyUsedDesc: "Ya has usado tu prueba gratuita. Actualiza a VIP para acceso completo.",
    errorActivation: "Activación fallida",
    errorActivationDesc: "Algo salió mal. Por favor, inténtalo más tarde.",
    colFree: "Gratis",
    colVip: "VIP",
    rowConfessions: "Confesiones diarias",
    rowConfessionsFree: "5/día",
    rowConfessionsVip: "Ilimitadas",
    rowCoins: "250 Monedas Bonus",
    rowCoinsFree: "—",
    rowCoinsVip: "250 monedas\n(una vez)",
    rowBadge: "Insignia VIP",
    rowFlairs: "Flairs Especiales",
  },
  de: {
    title: "Willkommen bei ConfessAI",
    subtitle: "VIP-Vorteile freischalten — keine Kreditkarte nötig.",
    trialBadge: "3-Tage kostenlose Testversion",
    startTrial: "Kostenlose Testversion starten",
    activating: "Wird aktiviert...",
    continueFree: "Kostenlos fortfahren",
    successTitle: "Willkommen bei VIP! 🎉",
    successDesc: "Deine 3-Tage-Testversion ist jetzt aktiv. Genieße alle VIP-Funktionen!",
    errorAlreadyUsed: "Testversion bereits genutzt",
    errorAlreadyUsedDesc: "Du hast deine kostenlose Testversion bereits genutzt. Upgrade auf VIP für vollen Zugriff.",
    errorActivation: "Aktivierung fehlgeschlagen",
    errorActivationDesc: "Etwas ist schiefgelaufen. Bitte versuche es später erneut.",
    colFree: "Kostenlos",
    colVip: "VIP",
    rowConfessions: "Tägliche Geständnisse",
    rowConfessionsFree: "5/Tag",
    rowConfessionsVip: "Unbegrenzt",
    rowCoins: "250 Bonus-Münzen",
    rowCoinsFree: "—",
    rowCoinsVip: "250 Münzen\n(einmalig)",
    rowBadge: "VIP-Abzeichen",
    rowFlairs: "Spezielle Flairs",
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
  onTrialActivated,
}: VIPOnboardingModalProps) => {
  const [isActivating, setIsActivating] = useState(false);
  const lang = (navigator.language || "en").slice(0, 2);
  const t = translations[lang] || translations.en;

  const parseInvokeError = async (invokeError: unknown): Promise<{ code: string | null; message: string | null }> => {
    const fallbackMessage = invokeError instanceof Error ? invokeError.message : null;

    if (!invokeError || typeof invokeError !== "object") {
      return { code: null, message: fallbackMessage };
    }

    const context = (invokeError as { context?: unknown }).context;

    if (context instanceof Response) {
      try {
        const payload = await context.clone().json() as Record<string, unknown>;
        return {
          code: typeof payload.error === "string" ? payload.error : null,
          message: typeof payload.message === "string" ? payload.message : fallbackMessage,
        };
      } catch {
        const textBody = await context.text().catch(() => "");
        return { code: null, message: textBody || fallbackMessage };
      }
    }

    if (context && typeof context === "object") {
      const body = (context as { body?: unknown }).body;
      if (typeof body === "string" && body) {
        try {
          const payload = JSON.parse(body) as Record<string, unknown>;
          return {
            code: typeof payload.error === "string" ? payload.error : null,
            message: typeof payload.message === "string" ? payload.message : fallbackMessage,
          };
        } catch {
          return { code: null, message: body };
        }
      }
    }

    const directCode = typeof (invokeError as { code?: unknown }).code === "string"
      ? (invokeError as { code: string }).code
      : null;

    return { code: directCode, message: fallbackMessage };
  };

  const handleActivateTrial = async () => {
    setIsActivating(true);
    logInfo("Activating VIP trial");

    try {
      const { data, error } = await supabase.functions.invoke("start-trial");

      if (error) {
        const parsedError = await parseInvokeError(error);
        const normalizedErrorCode = String(parsedError.code ?? "").toUpperCase();

        if (normalizedErrorCode === "TRIAL_ALREADY_USED") {
          toast.error(t.errorAlreadyUsed, { description: t.errorAlreadyUsedDesc });
          return;
        }

        logError("Trial activation failed", { error, parsedError });
        toast.error(t.errorActivation, { description: parsedError.message || t.errorActivationDesc });
        return;
      }

      const normalizedErrorCode = String(data?.error ?? "").toUpperCase();
      if (!data?.success) {
        if (normalizedErrorCode === "TRIAL_ALREADY_USED") {
          toast.error(t.errorAlreadyUsed, { description: t.errorAlreadyUsedDesc });
        } else {
          const fallbackMessage = typeof data?.message === "string" ? data.message : t.errorActivationDesc;
          toast.error(t.errorActivation, { description: fallbackMessage });
        }
        return;
      }

      logInfo("Trial activated successfully", { trialEndsAt: data.trial_ends_at });
      toast.success(t.successTitle, { description: t.successDesc, duration: 5000 });
      onOpenChange(false);
      onTrialActivated?.();
    } catch (error) {
      logError("Trial activation error", { error });
      toast.error(t.errorActivation, { description: t.errorActivationDesc });
    } finally {
      setIsActivating(false);
    }
  };

  const handleSkip = () => {
    logInfo("User skipped onboarding");
    onOpenChange(false);
  };

  const rows = [
    { label: t.rowConfessions, free: t.rowConfessionsFree, vip: t.rowConfessionsVip, isCheck: false },
    { label: t.rowCoins, free: t.rowCoinsFree, vip: t.rowCoinsVip, isCheck: false },
    { label: t.rowBadge, free: "—", vip: "check", isCheck: true },
    { label: t.rowFlairs, free: "—", vip: "check", isCheck: true },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[min(92vw,400px)] rounded-3xl border border-white/[0.08] p-0 overflow-hidden shadow-[0_0_80px_rgba(139,92,246,0.15)]"
        style={{
          background: "linear-gradient(180deg, hsl(260 20% 12%) 0%, hsl(260 15% 8%) 100%)",
          backdropFilter: "blur(40px)",
        }}
      >
        <DialogTitle className="sr-only">{t.title}</DialogTitle>

        <div className="flex flex-col items-center px-5 pt-7 pb-5 gap-3">
          {/* Title */}
          <h2 className="text-[clamp(1.25rem,5vw,1.5rem)] font-bold text-white tracking-tight text-center">
            {t.title}
          </h2>

          {/* Trial Badge */}
          <div
            className="px-4 py-1.5 rounded-full text-xs font-semibold text-white/90"
            style={{
              background: "linear-gradient(135deg, hsl(265 60% 45% / 0.5), hsl(265 60% 35% / 0.3))",
              border: "1px solid hsl(265 60% 50% / 0.3)",
              boxShadow: "0 0 12px hsl(265 60% 50% / 0.2)",
            }}
          >
            {t.trialBadge}
          </div>

          {/* Subtitle */}
          <p className="text-[clamp(0.8rem,3.5vw,0.875rem)] text-white/50 text-center font-light leading-snug">
            {t.subtitle}
          </p>

          {/* Comparison Table */}
          <div
            className="w-full rounded-2xl overflow-hidden mt-1"
            style={{
              background: "hsl(260 15% 14% / 0.6)",
              border: "1px solid hsl(0 0% 100% / 0.06)",
            }}
          >
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_70px_70px] items-center px-3 py-2.5">
              <div />
              <span className="text-center text-xs font-semibold text-white/40">{t.colFree}</span>
              <span className="text-center text-xs font-semibold text-primary">{t.colVip}</span>
            </div>

            {/* Rows */}
            {rows.map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_70px_70px] items-center px-3 py-2.5"
                style={{
                  borderTop: "1px solid hsl(0 0% 100% / 0.05)",
                }}
              >
                <span className="text-[0.8rem] font-medium text-white/70">{row.label}</span>
                <span className="text-center text-[0.75rem] text-white/30">{row.free}</span>
                <div className="flex items-center justify-center">
                  {row.isCheck ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <span className="text-[0.75rem] text-primary font-medium whitespace-pre-line text-center">
                      {row.vip}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Primary CTA */}
          <Button
            onClick={handleActivateTrial}
            disabled={isActivating}
            className="w-full h-12 rounded-2xl text-base font-semibold text-white border-0 mt-1"
            style={{
              background: "linear-gradient(to right, hsl(265 88% 72%), hsl(217 92% 68%))",
              boxShadow: "0 0 20px hsl(265 88% 72% / 0.3)",
            }}
          >
            {isActivating ? t.activating : t.startTrial}
          </Button>

          {/* Secondary */}
          <button
            onClick={handleSkip}
            className="text-sm text-white/35 hover:text-white/50 transition-colors py-1"
          >
            {t.continueFree}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
