import { Card } from "@/components/ui/card";
import { AlertTriangle, Info } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface SafetyCardProps {
  level: 'borderline' | 'unsafe';
  reason?: string;
}

/**
 * Safety warning card for content flagged by AI moderation
 */
export const SafetyCard = ({ level, reason }: SafetyCardProps) => {
  const { t, language } = useLanguage();

  if (level === 'borderline') {
    return (
      <Card className="bg-yellow-500/10 border-yellow-500/50 p-4 mb-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-sm text-yellow-700 dark:text-yellow-400 mb-1">
              {t.content_review_notice_title}
            </h4>
            <p className="text-xs text-yellow-700/90 dark:text-yellow-400/90 leading-relaxed">
              {language === 'en' && "Your content has been flagged for review. It may be published after moderation approval. Please ensure it follows our community guidelines."}
              {language === 'es' && "Tu contenido ha sido marcado para revisión. Puede ser publicado después de la aprobación de moderación."}
              {language === 'de' && "Dein Inhalt wurde zur Überprüfung markiert. Er kann nach der Moderationsfreigabe veröffentlicht werden."}
            </p>
            {reason && (
              <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-2 font-medium">
                {language === 'en' && "Reason"}
                {language === 'es' && "Razón"}
                {language === 'de' && "Grund"}: {reason}
              </p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-destructive/10 border-destructive/50 p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-sm text-destructive mb-1">
            {t.content_blocked_title}
          </h4>
          <p className="text-xs text-destructive/90 leading-relaxed">
            {language === 'en' && "This content violates our community guidelines and cannot be published. Please review our terms of service."}
            {language === 'es' && "Este contenido viola nuestras pautas comunitarias y no puede ser publicado. Por favor, revisa nuestros términos."}
            {language === 'de' && "Dieser Inhalt verstößt gegen unsere Community-Richtlinien und kann nicht veröffentlicht werden."}
          </p>
          {reason && (
            <p className="text-xs text-destructive/80 mt-2 font-medium">
              {language === 'en' && "Reason"}
              {language === 'es' && "Razón"}
              {language === 'de' && "Grund"}: {reason}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};
