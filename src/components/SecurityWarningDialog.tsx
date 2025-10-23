import { AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { ValidationIssue } from '@/lib/security/contentValidator';

interface SecurityWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issues: ValidationIssue[];
  onContinue: () => void;
  onCancel: () => void;
}

export const SecurityWarningDialog = ({
  open,
  onOpenChange,
  issues,
  onContinue,
  onCancel,
}: SecurityWarningDialogProps) => {
  const { t } = useLanguage();

  const getIssueMessage = (issue: ValidationIssue): string => {
    const messages: Record<string, Record<string, string>> = {
      en: {
        personal_info_detected: 'Personal information detected (email, phone, etc.)',
        suspicious_content_detected: 'Suspicious content patterns detected',
        excessive_profanity: 'Excessive profanity detected',
        rate_limit_exceeded: 'You are posting too frequently. Please wait.',
      },
      es: {
        personal_info_detected: 'Información personal detectada (correo, teléfono, etc.)',
        suspicious_content_detected: 'Patrones de contenido sospechoso detectados',
        excessive_profanity: 'Lenguaje ofensivo excesivo detectado',
        rate_limit_exceeded: 'Estás publicando muy frecuentemente. Por favor espera.',
      },
      de: {
        personal_info_detected: 'Persönliche Informationen erkannt (E-Mail, Telefon usw.)',
        suspicious_content_detected: 'Verdächtige Inhaltsmuster erkannt',
        excessive_profanity: 'Übermäßige Kraftausdrücke erkannt',
        rate_limit_exceeded: 'Sie posten zu häufig. Bitte warten Sie.',
      },
    };

    const lang = localStorage.getItem('language') || 'en';
    return messages[lang]?.[issue.message] || issue.message;
  };

  const criticalIssues = issues.filter(
    (i) => i.severity === 'critical' || i.severity === 'high'
  );

  const translations: Record<string, { title: string; description: string; continue: string; cancel: string; edit: string }> = {
    en: {
      title: 'Security Warning',
      description: 'We detected potential issues with your content:',
      continue: 'Post Anyway',
      cancel: 'Cancel',
      edit: 'Edit Content',
    },
    es: {
      title: 'Advertencia de Seguridad',
      description: 'Detectamos problemas potenciales con tu contenido:',
      continue: 'Publicar De Todas Formas',
      cancel: 'Cancelar',
      edit: 'Editar Contenido',
    },
    de: {
      title: 'Sicherheitswarnung',
      description: 'Wir haben potenzielle Probleme mit Ihrem Inhalt festgestellt:',
      continue: 'Trotzdem Posten',
      cancel: 'Abbrechen',
      edit: 'Inhalt Bearbeiten',
    },
  };

  const lang = localStorage.getItem('language') || 'en';
  const text = translations[lang];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {text.title}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>{text.description}</p>
            <ul className="list-disc list-inside space-y-2">
              {issues.map((issue, index) => (
                <li
                  key={index}
                  className={
                    issue.severity === 'critical' || issue.severity === 'high'
                      ? 'text-destructive font-medium'
                      : 'text-muted-foreground'
                  }
                >
                  {getIssueMessage(issue)}
                </li>
              ))}
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            {text.edit}
          </AlertDialogCancel>
          {criticalIssues.length === 0 && (
            <AlertDialogAction onClick={onContinue}>
              {text.continue}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
