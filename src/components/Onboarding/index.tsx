import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Sparkles, Bell, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";

interface OnboardingProps {
  userId: string;
  onComplete: () => void;
}

const translations = {
  en: {
    welcome_title: "Welcome to Confess! 🎉",
    welcome_desc: "Share your thoughts anonymously and connect with others in a safe space.",
    welcome_next: "Get Started",
    confession_title: "Share Your First Thought",
    confession_placeholder: "What's on your mind? (minimum 10 characters)",
    confession_next: "Continue",
    reminders_title: "Stay Connected",
    reminders_desc: "Enable daily reminders to keep your emotional wellness on track.",
    reminders_enable: "Enable Reminders",
    reminders_skip: "Maybe Later",
    skip: "Skip",
    reward_message: "🎉 You earned 10 coins!",
    error_min_length: "Please write at least 10 characters",
    error_save: "Failed to save. Please try again."
  },
  es: {
    welcome_title: "¡Bienvenido a Confess! 🎉",
    welcome_desc: "Comparte tus pensamientos anónimamente y conéctate con otros en un espacio seguro.",
    welcome_next: "Comenzar",
    confession_title: "Comparte Tu Primer Pensamiento",
    confession_placeholder: "¿Qué tienes en mente? (mínimo 10 caracteres)",
    confession_next: "Continuar",
    reminders_title: "Mantente Conectado",
    reminders_desc: "Activa recordatorios diarios para mantener tu bienestar emocional.",
    reminders_enable: "Activar Recordatorios",
    reminders_skip: "Tal Vez Después",
    skip: "Omitir",
    reward_message: "🎉 ¡Ganaste 10 monedas!",
    error_min_length: "Por favor escribe al menos 10 caracteres",
    error_save: "Error al guardar. Inténtalo de nuevo."
  },
  de: {
    welcome_title: "Willkommen bei Confess! 🎉",
    welcome_desc: "Teile deine Gedanken anonym und verbinde dich mit anderen in einem sicheren Raum.",
    welcome_next: "Loslegen",
    confession_title: "Teile Deinen Ersten Gedanken",
    confession_placeholder: "Was beschäftigt dich? (mindestens 10 Zeichen)",
    confession_next: "Weiter",
    reminders_title: "Bleib Verbunden",
    reminders_desc: "Aktiviere tägliche Erinnerungen für dein emotionales Wohlbefinden.",
    reminders_enable: "Erinnerungen Aktivieren",
    reminders_skip: "Vielleicht Später",
    skip: "Überspringen",
    reward_message: "🎉 Du hast 10 Münzen verdient!",
    error_min_length: "Bitte schreibe mindestens 10 Zeichen",
    error_save: "Fehler beim Speichern. Bitte versuche es erneut."
  }
};

export const Onboarding = ({ userId, onComplete }: OnboardingProps) => {
  const [step, setStep] = useState(1);
  const [confession, setConfession] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { language } = useLanguage();
  const { toast } = useToast();
  const t = translations[language];

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      await supabase
        .from("profiles")
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString()
        })
        .eq("user_id", userId);
      onComplete();
    } catch (error) {
      console.error("Error skipping onboarding:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfessionNext = async () => {
    if (confession.trim().length < 10) {
      toast({
        title: t.error_min_length,
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Save confession
      const { error: confessionError } = await supabase
        .from("confessions")
        .insert({
          user_id: userId,
          content: confession,
          category: "other",
          moderation_status: "approved"
        });

      if (confessionError) throw confessionError;

      // Award coins
      await supabase.rpc("award_coins", {
        p_user_id: userId,
        p_amount: 10,
        p_description: "First confession bonus",
        p_session_id: "onboarding_" + Date.now()
      });

      // Mark first confession as claimed
      await supabase
        .from("profiles")
        .update({ first_confession_claimed: true })
        .eq("user_id", userId);

      // Show reward toast and confetti
      toast({
        title: t.reward_message,
        duration: 3000
      });
      triggerConfetti();

      setStep(3);
    } catch (error) {
      console.error("Error saving confession:", error);
      toast({
        title: t.error_save,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnableReminders = () => {
    localStorage.setItem("dailyReminders", "true");
    completeOnboarding();
  };

  const completeOnboarding = async () => {
    setLoading(true);
    try {
      await supabase
        .from("profiles")
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString()
        })
        .eq("user_id", userId);
      onComplete();
    } catch (error) {
      console.error("Error completing onboarding:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 relative">
        {/* Skip button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2"
          onClick={handleSkip}
          disabled={loading}
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="space-y-4 text-center">
            <Sparkles className="h-12 w-12 mx-auto text-primary" />
            <h2 className="text-2xl font-bold">{t.welcome_title}</h2>
            <p className="text-muted-foreground">{t.welcome_desc}</p>
            <Button onClick={() => setStep(2)} className="w-full">
              {t.welcome_next}
            </Button>
          </div>
        )}

        {/* Step 2: First Confession */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-center">{t.confession_title}</h2>
            <Textarea
              value={confession}
              onChange={(e) => setConfession(e.target.value)}
              placeholder={t.confession_placeholder}
              className="min-h-[120px]"
              disabled={loading}
            />
            <Button
              onClick={handleConfessionNext}
              className="w-full"
              disabled={isSubmitting || confession.trim().length < 10}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{language === 'en' ? 'Posting...' : language === 'es' ? 'Publicando...' : 'Veröffentlichen...'}</span>
                </div>
              ) : (
                t.confession_next
              )}
            </Button>
          </div>
        )}

        {/* Step 3: Reminders */}
        {step === 3 && (
          <div className="space-y-4 text-center">
            <Bell className="h-12 w-12 mx-auto text-primary" />
            <h2 className="text-2xl font-bold">{t.reminders_title}</h2>
            <p className="text-muted-foreground">{t.reminders_desc}</p>
            <div className="space-y-2">
              <Button
                onClick={handleEnableReminders}
                className="w-full"
                disabled={loading}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {t.reminders_enable}
              </Button>
              <Button
                onClick={completeOnboarding}
                variant="ghost"
                className="w-full"
                disabled={loading}
              >
                {t.reminders_skip}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
