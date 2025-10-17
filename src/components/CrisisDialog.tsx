import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Phone, ExternalLink } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface CrisisDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Crisis intervention dialog with local help resources
 * Displays when self-harm or suicide keywords are detected
 */
export const CrisisDialog = ({ isOpen, onClose }: CrisisDialogProps) => {
  const { t, language } = useLanguage();

  // Localized crisis resources
  const resources = {
    en: [
      { name: "National Suicide Prevention Lifeline (US)", phone: "988", url: "https://988lifeline.org/" },
      { name: "Crisis Text Line (US)", phone: "Text HOME to 741741", url: "https://www.crisistextline.org/" },
      { name: "Samaritans (UK)", phone: "116 123", url: "https://www.samaritans.org/" },
      { name: "International Association for Suicide Prevention", phone: "", url: "https://www.iasp.info/resources/Crisis_Centres/" },
    ],
    es: [
      { name: "Teléfono de la Esperanza (España)", phone: "717 003 717", url: "https://www.telefonodelaesperanza.org/" },
      { name: "National Suicide Prevention Lifeline (US)", phone: "988", url: "https://988lifeline.org/help-yourself/en-espanol/" },
      { name: "Red Iberoamericana de Prevención del Suicidio", phone: "", url: "https://www.iasp.info/resources/Crisis_Centres/" },
    ],
    de: [
      { name: "Telefonseelsorge (Deutschland)", phone: "0800 111 0 111", url: "https://www.telefonseelsorge.de/" },
      { name: "Krisenchat (Deutschland)", phone: "", url: "https://krisenchat.de/" },
      { name: "Internationale Vereinigung für Suizidprävention", phone: "", url: "https://www.iasp.info/resources/Crisis_Centres/" },
    ],
  };

  const currentResources = resources[language] || resources.en;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl flex items-center gap-2">
            <Phone className="w-6 h-6 text-primary" />
            {language === 'en' && "You're Not Alone"}
            {language === 'es' && "No Estás Solo"}
            {language === 'de' && "Du Bist Nicht Allein"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base leading-relaxed space-y-3">
            <p className="text-foreground font-medium">
              {language === 'en' && "If you're having thoughts of self-harm or suicide, please reach out for help. Trained professionals are available 24/7 to support you."}
              {language === 'es' && "Si tienes pensamientos de autolesión o suicidio, por favor busca ayuda. Profesionales capacitados están disponibles 24/7 para apoyarte."}
              {language === 'de' && "Wenn du Gedanken an Selbstverletzung oder Suizid hast, suche bitte Hilfe. Geschulte Fachkräfte sind rund um die Uhr für dich da."}
            </p>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3 mt-4">
              <p className="font-semibold text-foreground">
                {language === 'en' && "Crisis Resources:"}
                {language === 'es' && "Recursos de Crisis:"}
                {language === 'de' && "Krisenressourcen:"}
              </p>
              
              {currentResources.map((resource, index) => (
                <div key={index} className="space-y-1 pb-3 border-b border-border last:border-0 last:pb-0">
                  <p className="font-medium text-sm">{resource.name}</p>
                  {resource.phone && (
                    <p className="text-sm flex items-center gap-2 text-primary">
                      <Phone className="w-3 h-3" />
                      {resource.phone}
                    </p>
                  )}
                  {resource.url && (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {language === 'en' && "Visit website"}
                      {language === 'es' && "Visitar sitio web"}
                      {language === 'de' && "Website besuchen"}
                    </a>
                  )}
                </div>
              ))}
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              {language === 'en' && "Remember: Crisis hotlines are confidential, free, and staffed by people who care."}
              {language === 'es' && "Recuerda: Las líneas de crisis son confidenciales, gratuitas y atendidas por personas que se preocupan."}
              {language === 'de' && "Denk daran: Krisenhotlines sind vertraulich, kostenlos und werden von Menschen betreut, denen du wichtig bist."}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button onClick={onClose} className="w-full">
            {language === 'en' && "I Understand"}
            {language === 'es' && "Entiendo"}
            {language === 'de' && "Ich Verstehe"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
