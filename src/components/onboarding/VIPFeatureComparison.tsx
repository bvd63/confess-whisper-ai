import { Check, X, Sparkles, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Feature {
  name: Record<string, string>;
  free: boolean | Record<string, string>;
  vip: boolean | Record<string, string>;
}

const features: Feature[] = [
  { 
    name: { en: "Daily confessions", es: "Confesiones diarias", de: "Tägliche Geständnisse" }, 
    free: { en: "3 per day", es: "3 por día", de: "3 pro Tag" }, 
    vip: { en: "10 per day", es: "10 por día", de: "10 pro Tag" } 
  },
  { 
    name: { en: "Anonymous posting", es: "Publicación anónima", de: "Anonyme Veröffentlichung" }, 
    free: true, 
    vip: true 
  },
  { 
    name: { en: "AI responses", es: "Respuestas IA", de: "KI-Antworten" }, 
    free: true, 
    vip: true 
  },
  { 
    name: { en: "Comment on confessions", es: "Comentar confesiones", de: "Geständnisse kommentieren" }, 
    free: true, 
    vip: true 
  },
  { 
    name: { en: "Like & share", es: "Me gusta y compartir", de: "Liken & Teilen" }, 
    free: true, 
    vip: true 
  },
  { 
    name: { en: "Direct messaging", es: "Mensajes directos", de: "Direktnachrichten" }, 
    free: true, 
    vip: true 
  },
  { 
    name: { en: "Confession boost", es: "Impulso de confesión", de: "Geständnis-Boost" }, 
    free: false, 
    vip: true 
  },
  { 
    name: { en: "Custom flairs", es: "Distintivos personalizados", de: "Benutzerdefinierte Flair" }, 
    free: { en: "Limited", es: "Limitado", de: "Begrenzt" }, 
    vip: { en: "Unlimited", es: "Ilimitado", de: "Unbegrenzt" } 
  },
  { 
    name: { en: "Priority support", es: "Soporte prioritario", de: "Prioritäts-Support" }, 
    free: false, 
    vip: true 
  },
  { 
    name: { en: "Ad-free experience", es: "Sin anuncios", de: "Werbefrei" }, 
    free: false, 
    vip: true 
  },
  { 
    name: { en: "Exclusive badges", es: "Insignias exclusivas", de: "Exklusive Abzeichen" }, 
    free: false, 
    vip: true 
  },
];

const labels = {
  en: {
    free: "Free",
    vip: "VIP",
    trialNote: "Start your 7-day free trial",
    trialDesc: "Experience all VIP features risk-free. No credit card required. Cancel anytime.",
  },
  es: {
    free: "Gratis",
    vip: "VIP",
    trialNote: "Comienza tu prueba gratuita de 7 días",
    trialDesc: "Experimenta todas las funciones VIP sin riesgo. Sin tarjeta de crédito. Cancela cuando quieras.",
  },
  de: {
    free: "Kostenlos",
    vip: "VIP",
    trialNote: "Starte deine 7-Tage kostenlose Testversion",
    trialDesc: "Erlebe alle VIP-Funktionen risikofrei. Keine Kreditkarte erforderlich. Jederzeit kündbar.",
  },
};

interface VIPFeatureComparisonProps {
  className?: string;
  lang?: string;
}

export const VIPFeatureComparison = ({ className, lang = "en" }: VIPFeatureComparisonProps) => {
  const currentLang = lang.slice(0, 2);
  const t = labels[currentLang as keyof typeof labels] || labels.en;

  return (
    <div className={cn("w-full", className)}>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="col-span-1" />
        <div className="flex items-center justify-center gap-2 text-muted-foreground font-semibold">
          <Sparkles className="w-4 h-4" />
          <span>{t.free}</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-primary font-semibold">
          <Crown className="w-4 h-4" />
          <span>{t.vip}</span>
        </div>
      </div>

      <div className="space-y-2">
        {features.map((feature, index) => {
          const featureName = typeof feature.name === "object" ? feature.name[currentLang] || feature.name.en : feature.name;
          const freeValue = typeof feature.free === "object" ? feature.free[currentLang] || feature.free.en : feature.free;
          const vipValue = typeof feature.vip === "object" ? feature.vip[currentLang] || feature.vip.en : feature.vip;

          return (
            <div
              key={index}
              className="grid grid-cols-3 gap-4 items-center py-3 px-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="col-span-1 text-sm font-medium text-foreground">
                {featureName}
              </div>
              <div className="flex items-center justify-center">
                {typeof freeValue === "boolean" ? (
                  freeValue ? (
                    <Check className="w-5 h-5 text-success" aria-label="Included" />
                  ) : (
                    <X className="w-5 h-5 text-muted-foreground" aria-label="Not included" />
                  )
                ) : (
                  <span className="text-xs text-muted-foreground font-medium">
                    {freeValue}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-center">
                {typeof vipValue === "boolean" ? (
                  vipValue ? (
                    <Check className="w-5 h-5 text-primary" aria-label="Included" />
                  ) : (
                    <X className="w-5 h-5 text-muted-foreground" aria-label="Not included" />
                  )
                ) : (
                  <span className="text-xs text-primary font-semibold">
                    {vipValue}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 rounded-lg bg-primary/10 border border-primary/20">
        <div className="flex items-start gap-3">
          <Crown className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-primary mb-1">
              {t.trialNote}
            </p>
            <p className="text-xs text-muted-foreground">
              {t.trialDesc}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
